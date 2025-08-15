This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Environment Setup

Before running the project, you need to set up your environment variables. Create a `.env.local` file in the root directory with the following variables:

```bash
# MongoDB Connection
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/database

# Redis Cloud Configuration
REDIS_HOST=your-redis-host.redis-cloud.com
REDIS_PORT=your-redis-port
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# JWT Secret Key (generate a strong random string)
SECRET_KEY=your-super-secret-jwt-key-here
```

### Generating a Secure SECRET_KEY

You can generate a secure JWT secret key using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Notes

- **Never commit `.env.local` to git** - it's already in `.gitignore`
- **Use strong, unique passwords** for all services
- **Rotate secrets regularly** in production
- **Use environment-specific configs** for different deployments

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Architecture

This project implements a **Cache-First Architecture** with:

- **Redis Cloud** for high-performance caching
- **MongoDB** for persistent data storage
- **Write-Behind Strategy** for optimal performance
- **Background Sync** for data consistency
- **Automatic Fallbacks** for reliability

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
