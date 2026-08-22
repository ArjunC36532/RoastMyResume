This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Spring Boot backend with Docker

The backend image is built with Java 17 and listens on port `8080`. Keep backend
secrets in `backend/.env`; the file is excluded from both Git and the Docker
build context and is supplied only when the container starts.

Build the image from the repository root:

```bash
docker build -t roastmyresume-backend:latest ./backend
```

Run it with the backend environment variables:

```bash
docker run --detach \
  --name roastmyresume-backend \
  --env-file backend/.env \
  --publish 8080:8080 \
  roastmyresume-backend:latest
```

Inspect the application logs and stop the container:

```bash
docker logs --follow roastmyresume-backend
docker stop roastmyresume-backend
docker rm roastmyresume-backend
```

For a typical x86_64 EC2 instance, build an explicitly compatible image:

```bash
docker buildx build \
  --platform linux/amd64 \
  --tag roastmyresume-backend:latest \
  --load \
  ./backend
```

Use `linux/arm64` instead when deploying to an AWS Graviton instance. Replace
`--load` with `--push` after tagging the image for a remote registry such as
Amazon ECR.

On EC2, keep the container bound to localhost so Nginx is the only public
entry point:

```bash
docker run --detach \
  --name roastmyresume-backend \
  --restart unless-stopped \
  --env-file /home/ec2-user/roastmyresume/backend.env \
  --publish 127.0.0.1:8080:8080 \
  YOUR_ECR_IMAGE
```

## Nginx reverse proxy on EC2

Nginx runs on the EC2 host, not inside the Spring Boot image. `docker run`
does not install or configure it. Copy [backend/deploy/nginx.conf](backend/deploy/nginx.conf)
onto the instance after Spring Boot is listening on `127.0.0.1:8080`.

1. Open security-group inbound TCP `80` from `0.0.0.0/0`. Do not open `8080`.
2. Install Nginx on Amazon Linux 2023:

```bash
sudo dnf install -y nginx
sudo systemctl enable --now nginx
```

3. If the stock Nginx `server` also claims port 80, disable that default
   block so this site owns the port. Then install the proxy config:

```bash
sudo cp backend/deploy/nginx.conf /etc/nginx/conf.d/roastmyresume.conf
sudo nginx -t
sudo systemctl reload nginx
```

4. Confirm Spring Boot locally, then the Elastic IP from your laptop:

```bash
curl -i http://127.0.0.1:8080
curl -i http://54.153.31.46
```

A Spring Boot status such as `404`, `401`, or `403` means the proxy works.

After that, point Vercel at the Elastic IP:

```dotenv
RESUME_API_URL=http://54.153.31.46
NEXT_PUBLIC_RESUME_API_URL=http://54.153.31.46
```

Keep the EC2 backend origin as the Vercel frontend URL:

```dotenv
FRONTEND_ORIGIN=https://roast-my-resume-gamma-one.vercel.app
```

Browser uploads from an HTTPS Vercel site to this HTTP API may be blocked.
The Vercel server-side roast call can still use `http://54.153.31.46`.

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
