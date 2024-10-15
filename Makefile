postgres:
	docker run --name postgres-tesis -e POSTGRES_USER=root -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=app_empleos -p 5432:5432 -d postgres:17-alpine

.PHONY: postgres
