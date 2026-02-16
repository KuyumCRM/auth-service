.PHONY: dev test test:unit test:int test:e2e migrate build docker:dev docker:down typecheck lint

dev:
	npm run dev

test:
	npm test

test:unit:
	npm run test:unit

test:int:
	npm run test:int

test:e2e:
	npm run test:e2e

migrate:
	npm run migrate

build:
	npm run build

docker:dev:
	npm run docker:dev

docker:down:
	npm run docker:down

typecheck:
	npm run typecheck

lint:
	npm run lint
