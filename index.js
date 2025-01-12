const express = require("express");
const { request } = require("undici");
const { Client, GatewayIntentBits } = require("discord.js");
const {
  clientId,
  clientSecret,
  port,
  guildId,
  roleId,
  token,
} = require("./config.json");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();

app.get("/", async ({ query }, response) => {
  const { code } = query;

  if (code) {
    try {
      // OAuth2 토큰 교환
      const tokenResponseData = await request(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: `http://localhost:${port}`,
            scope: "identify guilds.join",
          }).toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const oauthData = await tokenResponseData.body.json();

      // 유저 정보 가져오기
      const userResult = await request("https://discord.com/api/users/@me", {
        headers: {
          authorization: `${oauthData.token_type} ${oauthData.access_token}`,
        },
      });

      const user = await userResult.body.json();

      // 역할 부여
      const guild = client.guilds.cache.get(guildId);
      const member = await guild.members.fetch(user.id);
      await member.roles.add(roleId);

      return response.send(
        "인증이 완료되었습니다! 디스코드 서버를 확인해주세요."
      );
    } catch (error) {
      console.error(error);
      return response.send("오류가 발생했습니다.");
    }
  }

  return response.sendFile("index.html", { root: "." });
});

client.once("ready", () => {
  console.log("봇이 준비되었습니다!");
  app.listen(port, () =>
    console.log(`서버가 http://localhost:${port} 에서 실행중입니다`)
  );
});

client.login(token);
