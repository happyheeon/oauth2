const express = require("express");
const { request } = require("undici");
const { Client, GatewayIntentBits } = require("discord.js");

// Railway 환경 변수 사용
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const guildId = process.env.GUILD_ID;
const roleId = process.env.ROLE_ID;
const token = process.env.TOKEN;
const port = process.env.PORT || 3000;
const redirectUri = process.env.REDIRECT_URI; // 예: https://your-app-name.up.railway.app

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
            redirect_uri: redirectUri,
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

      const guild = client.guilds.cache.get(guildId);
      const member = await guild.members.fetch(user.id);

      // 기존 역할 제거 후 새 역할 추가
      await member.roles.remove("1323231709574987840"); // 제거할 역할 ID
      await member.roles.add(roleId); // 새로 추가할 역할

      return response.send(
        "인증이 완료되었습니다! 디스코드 서버를 확인해주세요."
      );
    } catch (error) {
      console.error(error);
      return response.send("오류가 발생했습니다.");
    }
  }

  // OAuth2 인증 페이지로 리다이렉트
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify%20guilds.join`;
  return response.redirect(authUrl);
});

client.once("ready", () => {
  console.log("봇이 준비되었습니다!");
  app.listen(port, () => console.log(`서버가 포트 ${port}에서 실행중입니다`));
});

client.login(token);
