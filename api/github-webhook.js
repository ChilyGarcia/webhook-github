import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WEBHOOKS = {
  "CerebiiaCompany/calidad": process.env.WEBHOOK_CALIDAD,
  "CerebiiaCompany/recursos-humanos": process.env.WEBHOOK_RECURSOS_HUMANOS,
  "CerebiiaCompany/transcription-microservice":
    process.env.WEBHOOK_TRANSCRIPTION_MICROSERVICE,
  "CerebiiaCompany/cv-microservice": process.env.WEBHOOK_CV_MICROSERVICE,
  "CerebiiaCompany/transcription_frontend":
    process.env.WEBHOOK_TRANSCRIPTION_FRONTEND,
  "CerebiiaCompany/personal-data-frontend":
    process.env.WEBHOOK_PERSONAL_DATA_FRONTEND,
};

const TARGET_BRANCHES = ["main", "develop"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const event = req.headers["x-github-event"];
  const payload = req.body;
  const repoName = payload.repository.full_name;
  const webhookUrl = WEBHOOKS[repoName];

  if (!webhookUrl) {
    console.warn(`Repositorio sin webhook configurado: ${repoName}`);
    return res
      .status(200)
      .json({ message: `No se configuró webhook para ${repoName}` });
  }

  try {
    if (event === "push") {
      const branch = payload.ref.replace("refs/heads/", "");
      if (TARGET_BRANCHES.includes(branch)) {
        const commitList = payload.commits
          .map((c) => `[\`${c.id.slice(0, 7)}\`](${c.url}) - ${c.message}`)
          .join("\n");

        const modifiedFiles = [
          ...new Set(
            payload.commits.flatMap((c) => [
              ...c.added,
              ...c.modified,
              ...c.removed,
            ])
          ),
        ]
          .slice(0, 10)
          .map((f) => `- ${f}`)
          .join("\n");

        await axios.post(webhookUrl, {
          embeds: [
            {
              title: `📦 Push a ${branch}`,
              description:
                `**Repositorio:** ${repoName}\n` +
                `**Autor:** ${payload.pusher.name}\n\n` +
                `**Commits:**\n${commitList}\n\n` +
                `**Archivos tocados:**\n${modifiedFiles || "Ninguno listado."}`,
              color: 0x00b0f4,
              timestamp: new Date().toISOString(),
              author: {
                name: payload.pusher.name,
              },
            },
          ],
        });
      }
    }

    if (event === "pull_request") {
      const action = payload.action;
      const allowedActions = ["opened", "reopened", "closed"];

      const targetBranch = payload.pull_request.base.ref;
      if (
        TARGET_BRANCHES.includes(targetBranch) &&
        allowedActions.includes(action)
      ) {
        const actionEmoji =
          action === "opened"
            ? "🔀"
            : action === "reopened"
            ? "🔄"
            : action === "closed" && payload.pull_request.merged
            ? "🟣"
            : "❌";

        const actionTitle =
          action === "opened"
            ? "Pull Request abierto hacia"
            : action === "reopened"
            ? "Pull Request reabierto hacia"
            : action === "closed" && payload.pull_request.merged
            ? "Pull Request fusionado en"
            : "Pull Request cerrado en";

        await axios.post(webhookUrl, {
          embeds: [
            {
              title: `${actionEmoji} ${actionTitle} ${targetBranch}`,
              url: payload.pull_request.html_url,
              description:
                `**Repositorio:** ${repoName}\n` +
                `**Título:** ${payload.pull_request.title}\n` +
                `**Autor:** ${payload.pull_request.user.login}`,
              color:
                action === "opened" || action === "reopened"
                  ? 0x4caf50
                  : payload.pull_request.merged
                  ? 0x9c27b0
                  : 0xff5722,
              timestamp: new Date().toISOString(),
              author: {
                name: payload.pull_request.user.login,
                icon_url: payload.pull_request.user.avatar_url,
              },
            },
          ],
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`Error enviando a Discord (${repoName}):`, err.message);
    res.status(500).json({ error: "Error al enviar a Discord" });
  }
}
