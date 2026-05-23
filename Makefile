.PHONY: run build migrate tidy frontend-install frontend-dev

run:
	go run .

build:
	go build -o bin/sanrio-coffee-api.exe .

migrate:
	psql -U tosiatung -d sanrio_coffee -f migrations/init.sql

tidy:
	go mod tidy

frontend-install:
	cd frontend && npm install
｀
frontend-dev:
	cd frontend && npm run dev
