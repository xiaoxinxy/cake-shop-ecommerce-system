# 蛋糕小铺 · 蛋糕商城系统

Spring Boot + MyBatis-Plus ecommerce system for a cake shop.

## Project Structure

- `src/main/java/com/taohq/cakeshop1/config`: MyBatis-Plus config
- `src/main/java/com/taohq/cakeshop1/controller`: web controllers
- `src/main/java/com/taohq/cakeshop1/entity`: database entities
- `src/main/java/com/taohq/cakeshop1/mapper`: MyBatis mapper interfaces
- `src/main/java/com/taohq/cakeshop1/service`: service interfaces and implementations
- `src/main/resources/static`: static pages and assets from the teacher package
- `src/main/resources/templates`: Thymeleaf templates
- `src/main/resources/schema.sql`: database table/data script

## Database

The application is configured to use database `cakeshop1` to avoid conflicting with an existing `cakeshop` database.

Default local account in `application.yml`:

- username: `root`
- password: `root`

Run `src/main/resources/schema.sql` in MySQL before starting the project.
