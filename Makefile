.PHONY: up desktop landing

up:
	./scripts/dev-start.sh

desktop:
	./scripts/run-desktop.sh

landing:
	cd apps/landing && npm install && npm run build
