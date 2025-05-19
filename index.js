/**
 * @author NTKhang(modded by Minato for render users)
 * ! The source code is written by NTKhang, please don't change the author's name everywhere. Thank you for using
 * ! Official source code: https://github.com/ntkhang03/Goat-Bot-V2
 * ! If you do not download the source code from the above address, you are using an unknown version and at risk of having your account hacked
 *
 * English:
 * ! Please do not change the below code, it is very important for the project.
 * It is my motivation to maintain and develop the project for free.
 * ! If you change it, you will be banned forever
 * Thank you for using
 *
 * Vietnamese:
 * ! Vui lòng không thay đổi mã bên dưới, nó rất quan trọng đối với dự án.
 * Nó là động lực để tôi duy trì và phát triển dự án miễn phí.
 * ! Nếu thay đổi nó, bạn sẽ bị cấm vĩnh viễn
 * Cảm ơn bạn đã sử dụng
 */

const login = require('facebook-chat-api');
    const { Octokit } = require('@octokit/rest');
    const { Pool } = require('pg');
    const fs = require('fs').promises;
    const path = require('path');
    require('dotenv').config();

    // Load appstate
    let appState;
    try {
      appState = JSON.parse(process.env.FB_APPSTATE);
    } catch (err) {
      console.error('Invalid FB_APPSTATE:', err);
      process.exit(1);
    }

    // Load commands dynamically
    async function loadCommands() {
      const cmdDir = path.join(__dirname, 'scripts', 'cmds');
      try {
        const files = await fs.readdir(cmdDir);
        const commands = {};
        for (const file of files) {
          if (file.startsWith('cmd_') && file.endsWith('.js')) {
            const cmd = require(path.join(cmdDir, file));
            commands[cmd.name] = cmd;
          }
        }
        return commands;
      } catch (err) {
        console.error('Load commands error:', err);
        return {};
      }
    }

    // Initialize bot
    login(
      { appState },
      { forceLogin: true },
      (err, api) => {
        if (err) {
          console.error('Login error:', err);
          return;
        }

        console.log('GoatBot logged in');

        // Initialize GitHub API
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        // Initialize PostgreSQL
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });

        // Save user data
        async function saveUserData(userId, username, command) {
          try {
            await pool.query(
              'INSERT INTO users (user_id, username, command, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id) DO UPDATE SET username = $2, command = $3, updated_at = NOW()',
              [userId, username, command]
            );
            console.log(`Saved data for user ${userId}`);
          } catch (err) {
            console.error('Database error:', err);
          }
        }

        // Commit to GitHub
        async function updateRepo(filePath, content, commitMessage) {
          try {
            const repo = { owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO };
            const fileContent = Buffer.from(content).toString('base64');
            const { data: currentFile } = await octokit.repos.getContent({
              ...repo,
              path: filePath
            }).catch(() => ({ data: null }));

            await octokit.repos.createOrUpdateFileContents({
              ...repo,
              path: filePath,
              message: commitMessage,
              content: fileContent,
              sha: currentFile ? currentFile.sha : undefined,
              branch: 'main'
            });
            console.log(`Committed to ${filePath}`);
          } catch (err) {
            console.error('GitHub API error:', err);
          }
        }

        // Load commands and handle messages
        (async () => {
          let commands = await loadCommands();

          api.listenMqtt((err, event) => {
            if (err) {
              console.error('Listen error:', err);
              return;
            }

            if (event.type === 'message' && event.body) {
              const userId = event.senderID;
              const text = event.body;
              let username = 'Unknown';

              api.getUserInfo(userId, (err, userInfo) => {
                if (err) {
                  console.error('User info error:', err);
                  return;
                }
                username = userInfo[userId].name || 'Unknown';

                // Handle dynamic commands
                for (const cmdName in commands) {
                  if (text.startsWith(`!${cmdName}`)) {
                    commands[cmdName].run(api, event);
                    saveUserData(userId, username, text);
                    return;
                  }
                }

                // Update command script
                if (text.startsWith('<p>cmd install')) {
                  const match = text.match(/^<p>cmd install\s+(\w+)\.js\s+(.+)$/);
                  if (!match) {
                    api.sendMessage('Usage: <p>cmd install <cmd_name>.js <code>', event.threadID);
                    return;
                  }

                  const [, cmdName, code] = match;
                  const filePath = `scripts/cmds/cmd_${cmdName}.js`;
                  const content = `module.exports = {
                    name: '${cmdName}',
                    run: (api, event) => {
                      ${code}
                    }
                  };`;

                  saveUserData(userId, username, text);
                  updateRepo(filePath, content, `Install ${cmdName} by ${username}`);
                  api.sendMessage(`Command ${cmdName} installed!`, event.threadID);

                  // Reload commands
                  loadCommands().then(newCommands => {
                    commands = newCommands;
                  });
                }

                // Update config (admin add)
                if (text.startsWith('<p>admin add')) {
                  const match = text.match(/^<p>admin add\s+(\d+)$/);
                  if (!match) {
                    api.sendMessage('Usage: <p>admin add <user_Id>', event.threadID);
                    return;
                  }

                  const [, userIdToAdd] = match;
                  const configUpdate = {
                    prefix: '!',
                    admins: [userIdToAdd]
                  };
                  const content = JSON.stringify(configUpdate, null, 2);

                  saveUserData(userId, username, text);
                  updateRepo('config.json', content, `Add admin ${userIdToAdd} by ${username}`);
                  api.sendMessage(`Admin ${userIdToAdd} added!`, event.threadID);
                }
              });
            }
          });
        })();
      }
    );
