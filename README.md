# AdaptFlight React website

## Project links

- Website: https://andre4wdev.github.io/AdaptFlight/
- About Us: https://andre4wdev.github.io/AdaptFlight/#/about
- Repository: https://github.com/andre4wDev/AdaptFlight
- Deployment status: https://github.com/andre4wDev/AdaptFlight/actions

The public repository is set up. The website becomes available after the first successful deployment. Future commits to `main` automatically rebuild and publish the site. The initial setup instructions below are retained for reference; do not create another repository.

This React + Vite project covers **Products** and **About Us** for the AdaptFlight class website. The Products page includes a scripted, interactive illustration of the product idea. It is a concept preview, not a trained AI model or proof of flight performance.

## 1. Put the project in your Windows folder

1. Download `AdaptFlight-React-Website.zip`.
2. Extract the **contents** of the ZIP into:

   `C:\Users\galve\OneDrive\Desktop\AdaptFlight`

3. Check that `package.json` is directly inside that folder. Avoid putting everything inside a second nested `AdaptFlight` folder.

You can extract it in File Explorer, or use this PowerShell command if the ZIP is in your Downloads folder:

```powershell
Expand-Archive -LiteralPath "C:\Users\galve\Downloads\AdaptFlight-React-Website.zip" -DestinationPath "C:\Users\galve\OneDrive\Desktop\AdaptFlight"
```

Change the ZIP path if it was saved somewhere else. Run extraction once, into the empty folder you created.

## 2. Run it on your computer

Install [Node.js 24 LTS](https://nodejs.org/) if Node is not already installed. This package requires Node 22.12 or newer and was checked with Node 24. Node includes npm. After installation, open a new PowerShell window and run:

```powershell
Set-Location "C:\Users\galve\OneDrive\Desktop\AdaptFlight"
npm install
npm run dev
```

Open the local address printed in the terminal, usually `http://localhost:5173/`. Keep that terminal open while using the development site. Press `Ctrl + C` to stop it.

This is a React project, so **use the development server instead of double-clicking `index.html`**. You only need to run `npm install` again if dependencies change; use `npm run dev` to start later sessions. No API keys or paid services are required.

To check the production build locally:

```powershell
npm run build
npm run preview
```

Open the address printed by the preview command. The build output goes into `dist/`.

## 3. Files you will edit

| File or folder | Purpose |
| --- | --- |
| `src/pages/ProductsPage.jsx` | Product description and page layout. |
| `src/pages/AboutPage.jsx` | About Us introduction and team layout. |
| `src/data/team.js` | Names, titles, bios, and photo paths. Start here for team updates. |
| `src/components/FlightPreview.jsx` | Scripted product illustration and controls. |
| `src/App.jsx` | Shared layout, navigation, and page selection. |
| `src/styles.css` | Colors, spacing, layouts, and mobile styling. |
| `public/images/team/` | Put the team's real profile photos here. |
| `src/main.jsx` | React entry point. |
| `index.html` | Vite's HTML entry file. |
| `vite.config.js` | Build configuration, including relative asset paths. |
| `.github/workflows/deploy.yml` | Builds and deploys the site to GitHub Pages. |

The two page addresses use `#/products` and `#/about`. Hash routes let the site switch pages without requiring a server to handle separate page URLs.

## 4. Finish the About Us profiles

The four names are filled from your October 21 Project Charter: Andrew Galvez, Arthur Stupa, Dara Mahmoudi, and Dhanush Somayajulu. Andrew's website role and short bio follow the assignment split you described. The charter does not provide the other members' individual titles or bios, and it contains no team photos. Those fields remain **clearly marked placeholders**. Replace them and add all four real photos before submitting.

### Add the photos

Put real profile photos in `public/images/team/`. Suggested filenames are `member-1.jpg`, `member-2.jpg`, `member-3.jpg`, and `member-4.jpg`. Use photos your teammates agree to display publicly. Keep the real extension: a PNG file should use `.png` in its filename and code path.

### Update the team data

Open `src/data/team.js`. The exported `teamMembers` array contains one object per person. Update each object's `name`, `role`, `bio`, `photo`, and `alt` fields. One member object follows this format:

```javascript
{
  name: "Full Name",
  role: "Your agreed team role",
  bio: "Write two or three accurate sentences about this person. Mention their relevant skills or interests and what they do on AdaptFlight.",
  photo: "images/team/member-1.jpg",
  alt: "Portrait of Full Name"
}
```

Keep the surrounding array, all members' objects, and commas between objects. Add or remove objects if your team size is different. A photo stored in `public/images/team/` uses a code path starting with `images/team/`, **without `public/` or a leading slash**.

For each bio, explain who the person is and what they handle on the project. Use titles your team has agreed on. Save the file; the development browser should update automatically.

If a photo does not appear, check its filename, extension, capitalization, and folder. Placeholder graphics do not meet the real-photo requirement.

## 5. Publish for free on GitHub Pages

These are setup instructions, not confirmation that the site is already published. GitHub Free supports Pages from **public** repositories, so the source and finished website will be public.

### Recommended: upload the source through GitHub

1. Sign in to GitHub as `andre4wDev`.
2. Create a **public** repository named `AdaptFlight`. Turn **Add README** on and create it.
3. Choose **Add file → Upload files**.
4. Drag the project files and folders from your local `AdaptFlight` folder into the uploader. Include `src/`, `public/`, `.github/`, `package.json`, `package-lock.json`, `vite.config.js`, `index.html`, and the supporting files. The package's README can replace the short README GitHub created.
5. **Do not upload `node_modules/`, `dist/`, the ZIP, or the outer `AdaptFlight` folder.** GitHub will install dependencies and build from the source. Confirm that `.github/workflows/deploy.yml` and `package-lock.json` are present.
6. Commit the upload to `main` with a message such as `Add AdaptFlight React website`.
7. Open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
8. Open the **Actions** tab and check the deployment workflow. If the first run occurred before Pages was enabled, run it again using **Run workflow** or the rerun control.
9. After the workflow succeeds, open **Settings → Pages → Visit site**.

With that account and repository name, the expected address is:

**https://andre4wdev.github.io/AdaptFlight/**

The address becomes available after successful deployment. Publication can take several minutes. A custom domain is optional; the default address does not require buying one.

The workflow runs `npm ci`, builds the React app, and publishes `dist/`. This project uses a relative Vite base and hash routes so its assets and pages work under the repository's `/AdaptFlight/` address.

If the repository already exists when you start, use it instead of making another one. Check existing files before uploading so you preserve teammates' work.

### Publish later changes

Edit and check the site locally. Upload the changed source files to the same repository paths and commit them to `main`. The workflow will rebuild and republish automatically. Local edits alone do not update the hosted website.

If a teammate edits directly on GitHub, bring those changes into your local copy before uploading again so you do not undo their work.

## 6. Optional: use Git in PowerShell

Use this route instead of the initial browser upload if Git is installed and you can authenticate to GitHub. For this route, create an **empty public repository without a README, license, or `.gitignore`**. These commands assume that empty remote and a local folder that is not already a Git repository:

```powershell
Set-Location "C:\Users\galve\OneDrive\Desktop\AdaptFlight"
git init -b main
git add .
git commit -m "Add AdaptFlight React website"
git remote add origin https://github.com/andre4wDev/AdaptFlight.git
git push -u origin main
```

Then select **Settings → Pages → Source → GitHub Actions** and check the deployment workflow.

For later changes:

```powershell
git add .
git commit -m "Update AdaptFlight website"
git push
```

If you already populated the repository through GitHub, do not run the initial commands against it. Continue the browser-upload route, or clone the existing repository and work from that clone.

## 7. Add teammates' pages when ready

This package covers Products and About Us. Teammates can add React components such as `src/pages/MissionPage.jsx` and `src/pages/CareersPage.jsx`. Then update the imports, route selection, and shared navigation in `src/App.jsx` to include them, using routes such as `#/mission` and `#/careers`.

Reuse the shared styles and navigation. Add navigation links only when the corresponding pages exist. Your teammates still need to supply the mission, values, research links, and job-posting content required for their portions of the assignment.

## 8. Before submitting

| Your rubric section | What to check |
| --- | --- |
| **About Us — 15 possible points** | Every actual member has a real photo, name, agreed title, and short accurate bio. Check the layout on a phone and desktop. |
| **Products — 10 possible points** | The page describes the idea, intended users, and simulated drone prototype. Try the interactive preview and retain its concept-preview label. |
| **Hosting extra credit** | Open the actual GitHub Pages link after a successful deployment and check the pages and images. |

All four photos and the remaining individual titles and bios still need your team's real information. The full company website also needs your teammates' other required sections.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `npm` is not recognized | Install Node.js, then open a new terminal. |
| PowerShell says `npm.ps1` cannot run | Use `npm.cmd install` and `npm.cmd run dev`, or run the same npm commands in Command Prompt. |
| The page is blank after opening `index.html` | Start it with `npm run dev` and use the printed local URL. |
| Photos are missing | Check the files in `public/images/team/` and matching paths in `src/data/team.js`. Capitalization must match. |
| The deployment fails | Read the failed step in the Actions tab. Confirm `package-lock.json` was uploaded and Pages Source is GitHub Actions. |
| The site returns 404 | Wait for a successful deployment and use the exact URL shown in Pages settings. |
| Published changes do not appear | Confirm the updated files were committed and deployed, then refresh with `Ctrl + F5`. |

## Official setup references

Documentation checked October 28, 2026:

- [Vite: getting started and Node requirements](https://vite.dev/guide/)
- [Vite: deploying to GitHub Pages](https://vite.dev/guide/static-deploy#github-pages)
- [Vite: relative base paths](https://vite.dev/guide/build#relative-base)
- [GitHub: creating a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [GitHub: configuring the publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub: uploading files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository?platform=windows)
- [GitHub: adding locally hosted code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

GitHub Pages hosts the static class project website. A future commercial flight service, account system, or server-side AI would need separate infrastructure.
