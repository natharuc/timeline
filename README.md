# Minha Linha do Tempo

Uma experiência visual que transforma a exportação da Linha do Tempo do Google Maps em um mapa interativo e um timelapse.

## O que tem

- Upload do arquivo `.json` diretamente pelo navegador
- Mapa real com o percurso registrado
- Timelapse com controles de reprodução, data e velocidade
- Resumo de distância, dias e paradas detectadas
- Destaque dos modos de deslocamento mais recorrentes
- Processamento local: o arquivo não é enviado nem armazenado pelo site

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Publicação na Vercel

1. Importe este repositório na Vercel.
2. Mantenha o preset **Next.js** detectado automaticamente.
3. Clique em **Deploy**.

O site não inclui dados de localização no código. Cada pessoa carrega o próprio arquivo no navegador.
