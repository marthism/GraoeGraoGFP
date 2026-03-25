# Welcome to GraoeGrao project

## Project info

**URL**: (https://github.com/marthism/fluxo-certo)

## How can I edit this code?

There are several ways of editing your application.


The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
## Desktop (Tauri + NSIS)

### Scripts

- **Web dev**: `npm run web:dev` (porta 8080)
- **Web build**: `npm run web:build`
- **Web preview**: `npm run web:preview` (porta 4173)
- **Desktop dev**: `npm run desktop:dev`
- **Desktop build (instalador)**: `npm run desktop:build`

### Saida do instalador

O instalador NSIS gerado fica em:

```
src-tauri/target/release/bundle/nsis/*.exe
```

### Escolha Web x Desktop no instalador

Na primeira pagina do instalador, voce escolhe:

- **Usar versao Web**: abre o navegador padrao e encerra o instalador.
- **Instalar versao Desktop**: segue o fluxo normal do NSIS.

A URL da versao web pode ser definida via variavel de ambiente `WEB_URL`.
Se nao existir, o fallback usado e:

```
http://localhost:4173
```

### Code Signing (opcional)

Se voce tiver um certificado, o instalador e o executavel podem ser assinados automaticamente.
Defina as variaveis:

- `CODESIGN_PFX_PATH`: caminho do certificado `.pfx`
- `CODESIGN_PFX_PASS`: senha do certificado
- `CODESIGN_TIMESTAMP_URL` (opcional): timestamp RFC3161. Default: `http://timestamp.digicert.com`

Sem assinatura, o Windows SmartScreen pode exibir aviso. Certificado EV reduz bastante esses alertas.
