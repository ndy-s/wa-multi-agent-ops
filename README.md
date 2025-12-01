# WhatsApp Multi-Agent Ops

<p>
  <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/icon.png" alt="Puppet Browser Logo" width="150" height="150" style="vertical-align: middle; margin-right: 15px;">
  <blockquote style="display: inline; font-size: 1.2em; margin: 0;">
    "Multi-agent WhatsApp automation for API and SQL operations."
  </blockquote>
</p>

## About This Project

This project started as a small personal experiment. I wanted to see how far I could push agentic AI to automate the repetitive tasks I deal with every day. What began as something simple slowly grew as I added more agent strategies, more controls, and more automation paths. At some point it became much bigger than I expected, and I'm still surprised by how much it can already do.

It's not perfect, but I keep refining it piece by piece, adjusting its behavior, polishing how the Agents respond, and improving whatever feels clunky or unnatural. It's a slow build, but a fun one.

### The Core Idea

The idea behind this project is very simple. I wanted a system that interacts the same way people normally talk. When a manager or coworker asks for something, they don't follow a rigid format. They just say what they want, and you understand.

I wanted to replicate that feeling.

Instead of opening a SQL editor, writing queries, or switching tools, you can simply talk to it the way you talk to a human.

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/api-agent-demo.gif" width="230" style="border-radius:8px;">
      <div style="margin-top:4px;"><strong>API Agent Demo</strong></div>
    </td>
    <td align="center">
      <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/sql-agent-demo.gif" width="230" style="border-radius:8px;">
      <div style="margin-top:4px;"><strong>SQL Agent Demo</strong></div>
    </td>
  </tr>
</table>

You can say something like:

> “Hey @Bot, show me today's transactions with the highest amounts.”

Or even something operational like:

> “Hey @Bot, create a loan account for UAT testing with a random user. Any balance is fine, just make sure the account is active.”

The Agents take over from there. They generate the SQL or make the API calls, retrieve the data, validate the response, and return everything back to you. There are no extra steps and no friction. It's just a natural conversation that gets work done.

### Why It's Cheap to Run?

Another thing that makes this project easy to maintain is that it relies completely on free AI models. I currently use Google's free [Gemini model](https://ai.google.dev/gemini-api) and several free models available on OpenRouter, especially the free [DeepSeek model](https://openrouter.ai/tngtech/tng-r1t-chimera:free). For embeddings, the system uses the free [MiniLM model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) from Hugging Face, which is lightweight and fast for vector-based tasks.

Since everything runs on free tiers, there are no costs to worry about.

Free models do come with trade-offs such as slower responses, occasional delays, and API usage limits. For personal use, these drawbacks are still acceptable and the system runs well enough for daily tasks.

If you ever want to scale it further or make it more powerful, switching to a paid state-of-the-art model will immediately give you faster responses, better accuracy, and a noticeably smoother experience.

## Quick Setup

Getting the system up and running is straightforward. Here's the workflow step by step.

### Clone Repository & Copy Environment File

First, clone the repository and set up your environment:

```bash
git clone https://github.com/ndy-s/wa-multi-agent-ops.git
cd wa-multi-agent-ops
cp .env-example .env
npm install
```

This will copy the example environment file and install all necessary dependencies.

### Start the Server

```bash
npm run start
```

This command will automatically launch the Dashboard. Open your browser and visit:

```
http://localhost:55555
```

> [!TIP]
> On the first startup, the system seeds all required Agents, their prompts, and registry data for base knowledge automatically. You can start using it immediately without manual setup.

The default login uses `admin` for the username and `password` for the password. You can change these credentials in the `.env` file and restart the server.

### Configure Your Agents

Inside the dashboard, go to **Agents Configuration** and fill in the required fields:

* **Base API URL** – Used by the API Agent to call external services. A default value is provided, so you only need to change it if you are testing your own API.
* **SQL Settings** – The SQL Agent currently supports Oracle only. Provide the username, password, and connection string (e.g., `192.168.1.10:1521/ORCL` or `localhost/XEPDB1`). Once configured, the SQL Agent can connect and execute queries.
* **LLM API keys** – Add keys for any AI models you want the bot to use, such as Gemini, DeepSeek, OpenRouter, or OpenAI. You can enter multiple keys, one per line. The system will automatically load-balance requests between them.
* **Model Priority** – Specify the order in which models should be tried. Place each model on its own row. The system uses a round-robin strategy to distribute tasks and provide fallback if a model is slow or unavailable.
* **Whitelist input** – List phone numbers or group IDs the bot is allowed to respond to. You can leave this empty initially. After linking WhatsApp, any unrecognized chat will be logged in the console. You can then copy the ID into the whitelist to authorize that chat.

> [!TIP]
> After saving the configuration, the system will validate your inputs, store the settings, and automatically start the WhatsApp bot.

If you want to modify the registry later, go to the **Agents Knowledge Base** section on the main dashboard. Here you can edit Agent prompts, API lists, database schemas, and available SQL commands. Everything is pre-seeded on the first run, so changes are only necessary if you want to extend or customize the system.

### Connect Your WhatsApp Account

When the bot starts, a QR code will appear in your console. Open WhatsApp on your phone, go to **Linked Devices**, and scan the code. Once linked, the bot is active and will respond to messages according to the whitelist.

> [!TIP]
> To interact with an Agent in a group chat, you must either tag the bot or quote its message. In private chats, you can simply send a message directly.

## Under the Hood

When I first started building this agent-based application, cost was the first thing on my mind. No matter how cool a project is, if it is expensive to run, it will not scale, and it probably will not get used at all. I wanted to avoid that trap, so cost became a key design consideration from day one.

For the AI itself, I experiment with both free and paid models. On the free side, I use Google Gemini-2.5-Flash and OpenRouter's DeepSeek-R1T2-Chimera models. Paid options include GPT-4.1 for faster, more capable responses. For embeddings, I rely on either the free all-MiniLM-L6-v2 model or text-embedding-3-small, depending on the task. In practice, the free models are already good enough for most tasks in this project.

To make integration with multiple LLM APIs easier, I rely on [LangChain](https://www.langchain.com/). Each model works a bit differently, and LangChain provides a consistent way to interact with them. Switching between models is simple and adding a new one usually requires only minor tweaks.

### The Agents

The core of this project is built around the Agents. Each has a specific role, a clear responsibility, and a simple way of interacting with the rest of the system. Instead of building one huge model that tries to do everything, I split the system into smaller, focused parts.

The two main Agents are the API Agent and the SQL Agent. Both rely on registries so the AI always knows what tools are available and how to use them.

#### API Agent

The API Agent handles external services. To make this reliable, I created an API registry containing the name, description, input parameters, output structure, and purpose of each endpoint. LLMs work much better with clear instructions. Without them, they either call the wrong API or guess randomly.

Adding a new API is simple. Describe it in the registry, define its parameters, and the Agent can start using it. Good descriptions matter more than complex prompts, making the Agent predictable and easier to debug.

> [!TIP]
> Make sure each API endpoint has a clear purpose and input/output structure. The more precise your descriptions, the fewer mistakes the Agent will make.

Finally, the base API URL and any required headers are configured in the dashboard, so the Agent knows where and how to send requests.

#### SQL Agent

The SQL Agent needs to be both powerful and safe. I designed it with two registries:

* **Schema registry:** Describes tables, columns, and relationships. The Agent can generate queries from this, but only for reading data.
* **SQL registry:** Contains predefined queries I wrote for updates, inserts, deletes, and other changes. The Agent can run these, but it cannot generate destructive SQL on its own.

> [!CAUTION]
> Never allow the SQL Agent to generate update or delete queries on its own. This could lead to unpredictable or destructive behavior.

This approach prevents hallucinations and keeps the system flexible. Generated queries are read-only, and any action that changes data is controlled.

#### Routing & Classifier Agent

User messages are routed to the appropriate Agent by a Classifier Agent, which predicts intent. To save on costs, certain keywords can immediately send a message to the right Agent. Typing `api` routes to the API Agent, and typing `sql` routes to the SQL Agent. These keywords are configurable in the dashboard.

#### Embeddings

LLMs have context window limits. Instead of dumping every registry entry into the prompt, this system uses embeddings to retrieve only the most relevant information.

Whenever a user sends a query:
1. The message is embedded
2. It is compared against vectors from registries such as API definitions, SQL schemas, predefined queries, and examples
3. The system selects two to six of the most relevant items
4. Those are added into the Agent prompt
5. The LLM receives only the necessary context

The number of retrieved items (top K) is configurable in the dashboard for each Agent.
If you want stricter behavior, reduce K. If you want broader matching, increase K.

#### Self-Correction

Even with good registries, LLMs can still hallucinate, especially when generating structured output such as API parameters or SQL payloads. To prevent this, each Agent uses a validation and retry loop:
1. The model generates structured output, for example `{ params: { ... } }`
2. The system validates it against the registry
3. If something is wrong (missing fields, wrong type, invalid value):
   * The Agent sends a clear error message back to the model
   * The model corrects itself using the feedback
4. This retry process continues until:
   * The output becomes valid, or
   * The maximum attempts are reached

This approach greatly increases accuracy. Even weaker free models like DeepSeek or Gemini Flash become more reliable when they are allowed to learn from their mistakes inside the loop.

Incorrect or incomplete structured outputs never reach the API or database because the Agent catches them first.

### The Bot

On top of the Agents sits the WhatsApp bot, which is the main entry point for users. I chose WhatsApp because it is the messaging app I use the most, both personally and for work. While the system could run on any messaging platform, WhatsApp was simply the most practical choice.

The bot is built with [Baileys](https://github.com/WhiskeySockets/Baileys), a library that handles sending and receiving messages, reactions, typing indicators, and more. The user sends a message, the bot forwards it to the right Agent, and the Agent responds. If needed, it asks for clarification or sends a confirmation request. To approve an action, the user can react with a thumbs-up emoji, keeping a human in the loop. I believe this is still important given current LLM capabilities.

> [!CAUTION]
> Each action has a 60-second timeout for automatic cancellation. If no confirmation is received within that time, the request will be canceled to prevent accidental operations.

I also worked to make the conversation feel natural. Agents reply in small chunks rather than one long message, and I added typing indicators with WPM-based speeds. These little touches make the interaction feel more human and prevent the bot from seeming rigid.

## Limitations

The Agents work best when given clear and specific instructions. Vague or ambiguous prompts can lead to incorrect API calls or incomplete SQL queries. Free models, in particular, may occasionally misinterpret uncommon terms, internal system names, or domain-specific jargon, even with the registry in place.

Ambiguous requests can also trigger follow-up questions from the Agent, adding extra steps before the action is executed. For safety, any SQL generated from the schema is strictly read-only, and all data-changing operations must be performed using predefined queries from the SQL registry.

## License

MIT
