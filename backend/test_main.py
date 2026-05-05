import base64
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import main  # noqa: E402


class FakeResponse:
    def __init__(self, payload: dict, ok: bool = True, status_code: int = 200):
        self._payload = payload
        self.is_success = ok
        self.status_code = status_code

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, responses: list[FakeResponse]):
        self._responses = responses
        self._idx = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, *args, **kwargs):
        response = self._responses[self._idx]
        self._idx += 1
        return response

    async def post(self, *args, **kwargs):
        response = self._responses[self._idx]
        self._idx += 1
        return response


class GmailPipelineTests(unittest.IsolatedAsyncioTestCase):
    async def test_refresh_access_token_updates_expiry(self):
        original = {
            "access_token": "old-token",
            "refresh_token": "refresh-token",
            "scope": "scope-a",
            "token_type": "Bearer",
        }
        mock_token_response = {
            "access_token": "new-token",
            "expires_in": 3600,
            "scope": "scope-b",
            "token_type": "Bearer",
        }
        with (
            patch.object(main, "_google_post_token", AsyncMock(return_value=mock_token_response)),
            patch.object(main, "_google_client_id", return_value="cid"),
            patch.object(main, "_google_client_secret", return_value="csecret"),
            patch.object(main, "_write_json") as write_json_mock,
        ):
            refreshed = await main._refresh_access_token(original)
        self.assertEqual(refreshed["access_token"], "new-token")
        self.assertEqual(refreshed["scope"], "scope-b")
        self.assertTrue(refreshed.get("expires_at"))
        write_json_mock.assert_called_once()

    async def test_gmail_ingest_messages_happy_path(self):
        body_text = "Hello from Gmail ingest"
        encoded = base64.urlsafe_b64encode(body_text.encode("utf-8")).decode("utf-8").rstrip("=")
        responses = [
            FakeResponse({"messages": [{"id": "m1", "threadId": "t1"}]}),
            FakeResponse(
                {
                    "id": "m1",
                    "threadId": "t1",
                    "internalDate": "123456789",
                    "snippet": "hello snippet",
                    "payload": {
                        "headers": [
                            {"name": "From", "value": "Sender <sender@example.com>"},
                            {"name": "Subject", "value": "Test Subject"},
                        ],
                        "mimeType": "text/plain",
                        "body": {"data": encoded},
                    },
                }
            ),
        ]
        with (
            patch.object(main, "_get_gmail_tokens", AsyncMock(return_value={"access_token": "token-123"})),
            patch.object(main.httpx, "AsyncClient", return_value=FakeClient(responses)),
            patch.object(main, "_write_json") as write_json_mock,
        ):
            result = await main.gmail_ingest_messages(main.GmailIngestRequest(maxResults=5))
        self.assertEqual(result.count, 1)
        self.assertEqual(result.messages[0].id, "m1")
        self.assertEqual(result.messages[0].fromAddress, "Sender <sender@example.com>")
        self.assertEqual(result.messages[0].subject, "Test Subject")
        self.assertEqual(result.messages[0].body, body_text)
        self.assertEqual(result.messages[0].priority, "needs reply")
        self.assertEqual(result.messages[0].nextAction, "Draft response")
        self.assertTrue(result.messages[0].summary)
        write_json_mock.assert_called_once()

    async def test_gmail_ingest_messages_retries_after_401(self):
        responses = [
            FakeResponse({}, ok=False, status_code=401),
            FakeResponse({"messages": [{"id": "m1", "threadId": "t1"}]}),
            FakeResponse(
                {
                    "id": "m1",
                    "threadId": "t1",
                    "payload": {"headers": [], "mimeType": "text/plain", "body": {"data": ""}},
                }
            ),
        ]
        with (
            patch.object(
                main,
                "_get_gmail_tokens",
                AsyncMock(return_value={"access_token": "token-1", "refresh_token": "refresh-1"}),
            ),
            patch.object(
                main,
                "_refresh_access_token",
                AsyncMock(return_value={"access_token": "token-2", "refresh_token": "refresh-1"}),
            ) as refresh_mock,
            patch.object(main.httpx, "AsyncClient", return_value=FakeClient(responses)),
            patch.object(main, "_write_json"),
        ):
            result = await main.gmail_ingest_messages(main.GmailIngestRequest(maxResults=5))
        self.assertEqual(result.count, 1)
        refresh_mock.assert_awaited_once()

    async def test_google_post_token_maps_failure_detail(self):
        with patch.object(
            main.httpx,
            "AsyncClient",
            return_value=FakeClient(
                [FakeResponse({"error": "invalid_grant", "error_description": "Code was already redeemed"}, ok=False)]
            ),
        ):
            with self.assertRaises(main.HTTPException) as ctx:
                await main._google_post_token({"grant_type": "authorization_code"})
        self.assertEqual(ctx.exception.status_code, 502)
        self.assertIn("invalid_grant", ctx.exception.detail)

    async def test_telemetry_events_accepts_supported_event(self):
        with patch.object(main, "_append_jsonl") as append_mock:
            result = await main.telemetry_events(
                main.TelemetryEventRequest(
                    event="draft_generated_error",
                    properties={"reason": "backend_timeout", "raw_email": "x" * 500},
                )
            )
        self.assertTrue(result.accepted)
        append_mock.assert_called_once()
        payload = append_mock.call_args[0][1]
        self.assertEqual(payload["event"], "draft_generated_error")
        self.assertEqual(payload["properties"]["reason"], "backend_timeout")
        # String values are capped to keep telemetry lightweight and privacy-safe.
        self.assertEqual(len(payload["properties"]["raw_email"]), 200)

    async def test_telemetry_events_rejects_unknown_event(self):
        with self.assertRaises(main.HTTPException) as ctx:
            await main.telemetry_events(main.TelemetryEventRequest(event="not_supported"))
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_summarize_uses_model_json_contract(self):
        model_json = '{"summary":"Customer asks for pricing details before committing.","nextAction":"Draft response"}'
        with patch.object(main, "call_openrouter", AsyncMock(return_value=model_json)):
            out = await main.summarize(
                main.SummaryRequest(
                    email="Could you share your pricing tiers and timeline?",
                    subject="Pricing question",
                    fromAddress="Buyer <buyer@example.com>",
                )
            )
        self.assertEqual(out.nextAction, "Draft response")
        self.assertEqual(out.priority, "needs reply")
        self.assertIn("pricing", out.summary.lower())

    async def test_summarize_falls_back_when_model_output_not_json(self):
        with patch.object(main, "call_openrouter", AsyncMock(return_value="Sure, here's a summary in plain text")):
            out = await main.summarize(
                main.SummaryRequest(
                    email="Urgent: security alert requires immediate action.",
                    subject="Security incident",
                    fromAddress="Ops <ops@example.com>",
                )
            )
        self.assertEqual(out.priority, "important")
        self.assertEqual(out.nextAction, "Respond today")

    async def test_outlook_ingest_messages_happy_path(self):
        responses = [
            FakeResponse(
                {
                    "value": [
                        {
                            "id": "o1",
                            "conversationId": "c1",
                            "receivedDateTime": "2026-05-05T14:00:00Z",
                            "from": {"emailAddress": {"address": "sender@contoso.com"}},
                            "subject": "Project update",
                            "bodyPreview": "Can we sync later today?",
                        }
                    ]
                }
            ),
            FakeResponse({"body": {"content": "Can we sync later today to review milestones?"}}),
        ]
        with (
            patch.object(main, "_get_outlook_tokens", AsyncMock(return_value={"access_token": "outlook-token"})),
            patch.object(main.httpx, "AsyncClient", return_value=FakeClient(responses)),
            patch.object(main, "_write_json") as write_json_mock,
        ):
            result = await main.outlook_ingest_messages(main.OutlookIngestRequest(maxResults=5))

        self.assertEqual(result.count, 1)
        self.assertEqual(result.messages[0].id, "o1")
        self.assertEqual(result.messages[0].threadId, "c1")
        self.assertEqual(result.messages[0].fromAddress, "sender@contoso.com")
        self.assertEqual(result.messages[0].subject, "Project update")
        self.assertIn("review milestones", result.messages[0].body or "")
        self.assertEqual(result.messages[0].priority, "needs reply")
        self.assertEqual(result.messages[0].nextAction, "Draft response")
        write_json_mock.assert_called_once()

    async def test_outlook_ingest_messages_retries_after_401(self):
        responses = [
            FakeResponse({}, ok=False, status_code=401),
            FakeResponse({"value": [{"id": "o1", "conversationId": "c1"}]}),
            FakeResponse({"body": {"content": "Hi"}}),
        ]
        with (
            patch.object(
                main,
                "_get_outlook_tokens",
                AsyncMock(return_value={"access_token": "token-1", "refresh_token": "refresh-1"}),
            ),
            patch.object(
                main,
                "_refresh_outlook_access_token",
                AsyncMock(return_value={"access_token": "token-2", "refresh_token": "refresh-1"}),
            ) as refresh_mock,
            patch.object(main.httpx, "AsyncClient", return_value=FakeClient(responses)),
            patch.object(main, "_write_json"),
        ):
            result = await main.outlook_ingest_messages(main.OutlookIngestRequest(maxResults=5))

        self.assertEqual(result.count, 1)
        refresh_mock.assert_awaited_once()

    async def test_summarize_uses_priority_when_next_action_invalid(self):
        model_json = '{"summary":"Need to circle back next week.","nextAction":"follow_up_later","priority":"follow-up"}'
        with patch.object(main, "call_openrouter", AsyncMock(return_value=model_json)):
            out = await main.summarize(
                main.SummaryRequest(
                    email="Following up on our timeline discussion.",
                    subject="Timeline check-in",
                    fromAddress="Partner <partner@example.com>",
                )
            )
        self.assertEqual(out.priority, "follow up")
        self.assertEqual(out.nextAction, "Schedule follow-up")

    async def test_telemetry_events_accepts_classifier_feedback_events(self):
        with patch.object(main, "_append_jsonl") as append_mock:
            result = await main.telemetry_events(
                main.TelemetryEventRequest(
                    event="classifier_feedback_submitted",
                    properties={"kind": "summary_quality_negative"},
                )
            )
        self.assertTrue(result.accepted)
        append_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
