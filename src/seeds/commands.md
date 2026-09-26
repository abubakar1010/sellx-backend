# Run all seeds (pick the ones you need)

```bash
docker compose exec api npx ts-node -r tsconfig-paths/register ./src/seeds/superAdmin.seed.ts
docker compose exec api npx ts-node -r tsconfig-paths/register ./src/seeds/categories.seed.ts
docker compose exec api npx ts-node -r tsconfig-paths/register ./src/seeds/products.seed.ts
docker compose exec api npx ts-node -r tsconfig-paths/register ./src/seeds/boost-plans.seed.ts
docker compose exec api npx ts-node -r tsconfig-paths/register ./src/seeds/ads-packages.seed.ts
docker compose exec api npx ts-node -r tsconfig-paths/register ./src/seeds/payments.seed.ts
docker compose exec api npx ts-node -r tsconfig-paths/register ./src/seeds/adminNotifications.seed.ts
```
