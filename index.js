const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const PREFIX = '!';

const ANNOUNCEMENTS_CHANNEL_ID = '1376878458482724864';

// Mapeo de canales a áreas
const AREA_CHANNELS = {
  web: '1370373806828421190',
  comercial: '1370373825589547079',
  '3d': '1370373867092181003',
  investigacion: '1372890682544357396',
  proyectos: '1370373846401679460',
};

// Array en memoria para guardar reuniones
let reuniones = [];

client.on('ready', () => {
  console.log(`Bot ${client.user.tag} listo!`);

  // Cron para resumen diario a las 16:30 hora canaria
  cron.schedule(
    '30 16 * * *',
    async () => {
      console.log('Ejecutando resumen diario');

      const channel = await client.channels.fetch(ANNOUNCEMENTS_CHANNEL_ID);
      if (!channel) return console.log('No se encontró canal de anuncios');

      let resumen = '';

      for (const [area, canalId] of Object.entries(AREA_CHANNELS)) {
        try {
          const areaChannel = await client.channels.fetch(canalId);
          if (!areaChannel) continue;

          const messages = await areaChannel.messages.fetch({ limit: 100 });
          const hoy = new Date();
          const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          const archivosHoy = messages.filter(
            (msg) => msg.createdTimestamp >= hoyInicio.getTime() && msg.attachments.size > 0
          );

          if (archivosHoy.size > 0) {
            resumen += `\n**AREA ${area.toUpperCase()}**\n`;
            archivosHoy.forEach((msg) => {
              const nombresArchivos = [...msg.attachments.values()].map((a) => a.name).join(', ');
              resumen += `--> Se subió(s) archivo(s) ${nombresArchivos} por <@${msg.author.id}>\n`;
            });
          }
        } catch (err) {
          console.error(`Error accediendo a canal ${canalId}:`, err);
        }
      }

      if (resumen === '') {
        resumen = 'No se subieron archivos hoy en ninguna área.';
      }

      channel.send(resumen);
    },
    {
      timezone: 'Atlantic/Canary',
    }
  );
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ayuda') {
    return message.channel.send(
      `Comandos disponibles:\n` +
        `!ayuda - Muestra esta ayuda\n` +
        `!dia - Información del día\n` +
        `!trabajo - Estado del trabajo\n` +
        `!reuniones - Lista de reuniones\n` +
        `!añadir-dia-reunion <día> <lugar> - Añadir día para reunión\n` +
        `!resumen - Resumen diario automático a las 16:30\n`
    );
  }

  if (command === 'dia') {
    return message.channel.send('Hoy es un gran día para avanzar en las prácticas de trabajo.');
  }

  if (command === 'trabajo') {
    return message.channel.send('El trabajo de hoy está en progreso, recuerda subir tus archivos en el canal correspondiente.');
  }

  if (command === 'reuniones') {
    if (reuniones.length === 0) {
      return message.channel.send('No hay reuniones programadas.');
    }

    const embed = new EmbedBuilder()
      .setTitle('📅 Reuniones')
      .setColor('#0099ff');

    reuniones.forEach((r, i) => {
      embed.addFields({ name: `Reunión ${i + 1}`, value: `**Día:** ${r.dia}\n**Lugar:** ${r.lugar}` });
    });

    return message.channel.send({ embeds: [embed] });
  }

  if (command === 'añadir-dia-reunion') {
    if (args.length === 0) {
      return message.channel.send(
        'Por favor completa el comando con la información de la reunión.\nEjemplo:\n`!añadir-dia-reunion Lunes Sala 5`'
      );
    }

    const dia = args.shift();
    const lugar = args.join(' ');

    if (!dia || !lugar) {
      return message.channel.send('Formato incorrecto. Usa: `!añadir-dia-reunion <día> <lugar>`');
    }

    reuniones.push({ dia, lugar });

    return message.channel.send(`✅ Reunión añadida correctamente:\nDía: **${dia}**\nLugar: **${lugar}**`);
  }

  if (command === 'resumen') {
    const channel = await client.channels.fetch(ANNOUNCEMENTS_CHANNEL_ID);
    if (!channel) return message.channel.send('No se pudo encontrar el canal de anuncios.');

    let resumen = '';

    for (const [area, canalId] of Object.entries(AREA_CHANNELS)) {
      try {
        const areaChannel = await client.channels.fetch(canalId);
        if (!areaChannel) continue;

        const messages = await areaChannel.messages.fetch({ limit: 100 });
        const hoy = new Date();
        const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const archivosHoy = messages.filter(
          (msg) => msg.createdTimestamp >= hoyInicio.getTime() && msg.attachments.size > 0
        );

        if (archivosHoy.size > 0) {
          resumen += `\n**AREA ${area.toUpperCase()}**\n`;
          archivosHoy.forEach((msg) => {
            const nombresArchivos = [...msg.attachments.values()].map((a) => a.name).join(', ');
            resumen += `--> Se subió(s) archivo(s) ${nombresArchivos} por <@${msg.author.id}>\n`;
          });
        }
      } catch (err) {
        console.error(`Error accediendo a canal ${canalId}:`, err);
      }
    }

    if (resumen === '') {
      resumen = 'No se subieron archivos hoy en ninguna área.';
    }

    return message.channel.send(resumen);
  }
});

// --- Servidor Express para mantener activo el bot ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot Practicas Trabajo activo');
});

app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});

client.login(process.env.TOKEN);
