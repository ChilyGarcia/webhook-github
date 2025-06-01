import axios from 'axios';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/XXXXXXXXX/YYYYYYYYY';
const TARGET_BRANCHES = ['main', 'develop'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  try {
    if (event === 'push') {
      const branch = payload.ref.replace('refs/heads/', '');
      if (TARGET_BRANCHES.includes(branch)) {
        const commits = payload.commits.map(c => `- ${c.message}`).join('\n').slice(0, 1900);
        await axios.post(DISCORD_WEBHOOK_URL, {
          content: `📦 Push a \\`${branch}\\` por ${payload.pusher.name}\nCommits:\n${commits}`,
        });
      }
    }

    if (event === 'pull_request') {
      const targetBranch = payload.pull_request.base.ref;
      if (TARGET_BRANCHES.includes(targetBranch)) {
        await axios.post(DISCORD_WEBHOOK_URL, {
          content: `🔀 Pull Request hacia \\`${targetBranch}\\`: ${payload.pull_request.title}\nAutor: ${payload.pull_request.user.login}\n${payload.pull_request.html_url}`,
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error enviando a Discord:', err);
    res.status(500).json({ error: 'Error al enviar a Discord' });
  }
}