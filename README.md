# docs.ricearaul.com

Documentation site built with [VitePress](https://vitepress.dev/).

## Development

```bash
npm install
npm run docs:dev
```

## Build

```bash
npm run docs:build
```

## Deployment

The site is containerized with Docker and deployed to Kubernetes via ArgoCD.

### Docker

```bash
docker build -t ghcr.io/ricearaul/docs.ricearaul.com:latest .
docker push ghcr.io/ricearaul/docs.ricearaul.com:latest
```

### Helm (manual first deploy)

```bash
helm install docs-ricearaul ./chart --namespace docs-ricearaul-com --create-namespace
```

### CI/CD

On merge to `master`, a GitHub Actions workflow builds and pushes the image to GHCR, then updates the image tag in `chart/values.yaml`. ArgoCD detects the change and syncs the deployment automatically.
