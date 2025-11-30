# WhatsApp Multi-Agent Ops

<p>
  <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/icon.png" alt="Puppet Browser Logo" width="150" height="150" style="vertical-align: middle; margin-right: 15px;">
  <blockquote style="display: inline; font-size: 1.2em; margin: 0;">
    "Multi-agent WhatsApp automation for API and SQL operations."
  </blockquote>
</p>

## About This Project

This project started as a small personal experiment. I wanted to see how far I could push agentic AI to automate the repetitive tasks I deal with every day. What began as something simple slowly grew as I added more agent strategies, more controls, and more automation paths. At some point it became much bigger than I expected, and I'm still surprised by how much it can already do.

It's not perfect, but I keep refining it piece by piece, adjusting its behavior, polishing how the agents respond, and improving whatever feels clunky or unnatural. It's a slow build, but a fun one.

### The Core Idea

The idea behind this project is very simple. I wanted a system that interacts the same way people normally talk. When a manager or coworker asks for something, they don't follow a rigid format. They just say what they want, and you understand.

I wanted to replicate that feeling.

Instead of opening a SQL editor, writing queries, or switching tools, you can simply talk to it the way you talk to a human.

You can say something like:

> “Hey @Bot, show me today's transactions with the highest amounts.”

Or even something operational like:

> “Hey @Bot, create a loan account for UAT testing with a random user, any balance is fine, just make sure the account is active.”

The agents take over from there. They generate the SQL or make the API calls, retrieve the data, validate the response, and return everything back to you. There are no extra steps and no friction. It's just a natural conversation that gets work done.

<div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
  <div style="width: 90px; height: 90px;">
    <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/api-agent-demo.gif" 
         alt="API Agent Demo" 
         style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
    <p style="text-align: center; font-size: 0.65em; margin: 2px 0 0;">API Agent Demo</p>
  </div>

  <div style="width: 90px; height: 90px;">
    <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/sql-agent-demo.gif" 
         alt="SQL Agent Demo" 
         style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
    <p style="text-align: center; font-size: 0.65em; margin: 2px 0 0;">SQL Agent Demo</p>
  </div>
</div>

### Why It's Cheap to Run

Another thing that makes this project easy to maintain is that it relies completely on free AI models. I currently use Google's free [Gemini model](https://ai.google.dev/gemini-api) and several free models available on OpenRouter, especially the free [DeepSeek model](https://openrouter.ai/tngtech/tng-r1t-chimera:free).

Since everything runs on free tiers, there are no costs to worry about.

Free models do come with trade-offs such as slower responses, occasional delays, and API usage limits. For personal use, these drawbacks are still acceptable and the system runs well enough for daily tasks.

If you ever want to scale it further or make it more powerful, switching to a paid state-of-the-art model will immediately give you faster responses, better accuracy, and a noticeably smoother experience.

## Quick Setup

Getting everything running is simple. Here’s the full workflow.

### Clone Repository & Copy Environment File

Before running anything, copy the example environment file:

```bash
git clone https://github.com/ndy-s/wa-multi-agent-ops.git
cd wa-multi-agent-ops
cp .env-example .env
npm install
```

### Start the Server

```bash
npm run start
```

This will automatically launch the Dashboard.
Open your browser and visit:

```
http://localhost:55555
```

On first startup, the system will automatically seed all required agents, registry data, and base knowledge, so you can start immediately without manual seeding. The default dashboard login uses the username "**admin**" with the password "**password**". You can change these values in the `.env` file and rerun the application.

### Configure Your Agents

Inside the dashboard, open the Agent Configuration menu and fill in all required fields:

* **Base API URL**: This is used by the API agent to call external services. A default value is already provided, so you do not need to change this unless you want to test with your own custom API endpoint.
* **SQL Settings**: Currently, the SQL agent only supports Oracle. You need to provide the username, password, and connection string. For example, your connection string could be `192.168.1.10:1521/ORCL` or `localhost/XEPDB1`, depending on your Oracle setup. Once entered, the SQL agent can connect to the database and execute queries.
* **LLM API keys**: Add keys for any models you want the bot to use, such as Gemini, DeepSeek, OpenRouter, or OpenAI. You can enter more than one API key by putting each key on a separate row. The system uses these keys to load-balance requests.
* **Model Priority**: Enter the order in which the models should be used. Each model name should be placed on its own row. This priority list determines which model is tried first. The system uses a [round-robin](https://en.wikipedia.org/wiki/Round-robin_scheduling) strategy internally to distribute tasks and provide fallback if a model is slow or unavailable.
* **Whitelist input**: Enter phone numbers or group IDs that the bot is allowed to respond to. You can leave this empty at first. After linking your WhatsApp account, if a message comes from a chat not in the whitelist, the bot will log the user or group ID in the console. You can then copy the ID and add it to the whitelist so the bot will start responding in that chat. This makes it easy to manage authorized chats dynamically.

After clicking Save Configuration, the system will check whether configuration data already exists, store and apply the settings, and automatically start the WhatsApp bot.

If you need to modify the registry, return to the main dashboard page and open the Registry section. This includes items such as agent prompts and knowledge base definitions like API lists, database schema, and available SQL commands. Everything is automatically seeded on first run, so you do not need to change anything unless you want to extend or customize the system.

### Connect Your WhatsApp Account

When the bot starts, a QR code will appear in your console. Open WhatsApp on your phone, go to Linked Devices, and scan the QR code. Once linked, the bot is active and ready to respond to messages according to the whitelist.

