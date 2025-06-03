import axios from 'axios';

const WEBHOOKS = {
  'CerebiiaCompany/calidad': 'https://discord.com/api/webhooks/1379476884034949180/WHRzY9fgxsRqoVy_D6CpRXgbx-AnOFBtujArgx2jhS5vaoC1TDtr3MBiNHz3qYdfI50L',
  'CerebiiaCompany/recursos-humanos': 'https://discord.com/api/webhooks/1379476558141718693/O8e7ZNbJ9V_hltmO6JlvkwnxLmE-sIb48uPlLoS4KBjv36BkEDJ2zZlTAlDJDdQaUAhh'
};

const TARGET_BRANCHES = ['main', 'develop'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;
  const repoName = payload.repository.full_name;
  const webhookUrl = WEBHOOKS[repoName];

  if (!webhookUrl) {
    console.warn(`Repositorio sin webhook configurado: ${repoName}`);
    return res.status(200).json({ message: `No se configuró webhook para ${repoName}` });
  }

  try {
    if (event === 'push') {
      const branch = payload.ref.replace('refs/heads/', '');
      if (TARGET_BRANCHES.includes(branch)) {
        const commitList = payload.commits.map(c =>
          `[\`${c.id.slice(0, 7)}\`](${c.url}) - ${c.message}`
        ).join('\n');

        const modifiedFiles = [
          ...new Set(payload.commits.flatMap(c => [...c.added, ...c.modified, ...c.removed]))
        ]
          .slice(0, 10)
          .map(f => `- ${f}`)
          .join('\n');

        await axios.post(webhookUrl, {
          embeds: [
            {
              title: `📦 Push a ${branch}`,
              description:
                `**Repositorio:** ${repoName}\n` +
                `**Autor:** ${payload.pusher.name}\n\n` +
                `**Commits:**\n${commitList}\n\n` +
                `**Archivos tocados:**\n${modifiedFiles || 'Ninguno listado.'}`,
              color: 0x00b0f4,
              timestamp: new Date().toISOString(),
              author: {
                name: payload.pusher.name
              }
            }
          ]
        });
      }
    }

    if (event === 'pull_request') {
      const targetBranch = payload.pull_request.base.ref;
      if (TARGET_BRANCHES.includes(targetBranch)) {
        await axios.post(webhookUrl, {
          embeds: [
            {
              title: `🔀 Pull Request hacia ${targetBranch}`,
              url: payload.pull_request.html_url,
              description:
                `**Repositorio:** ${repoName}\n` +
                `**Título:** ${payload.pull_request.title}\n` +
                `**Autor:** ${payload.pull_request.user.login}`,
              color: 0x4caf50,
              timestamp: new Date().toISOString(),
              author: {
                name: payload.pull_request.user.login,
                icon_url: payload.pull_request.user.avatar_url
              }
            }
          ]
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`Error enviando a Discord (${repoName}):`, err.message);
    res.status(500).json({ error: 'Error al enviar a Discord' });
  }
}
