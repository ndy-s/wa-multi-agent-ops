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

The agents take over from there. They generate the SQL, make the API calls, retrieve the data, validate the response, and return everything back to you. There are no extra steps and no friction. It's just a natural conversation that gets work done.

### Why It's Cheap to Run

Another thing that makes this project easy to maintain is that it relies completely on free AI models. I currently use Google's free [Gemini model](https://ai.google.dev/gemini-api) and several free models available on OpenRouter, especially the free [DeepSeek model](https://openrouter.ai/tngtech/tng-r1t-chimera:free).

Since everything runs on free tiers, there are no costs to worry about.

Free models do come with trade-offs such as slower responses, occasional delays, and API usage limits. For personal use, these drawbacks are still acceptable and the system runs well enough for daily tasks.

If you ever want to scale it further or make it more powerful, switching to a paid state-of-the-art model will immediately give you faster responses, better accuracy, and a noticeably smoother experience.

