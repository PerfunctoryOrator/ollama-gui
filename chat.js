function parseMarkdown(text) {
    // Escape HTML
    text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

    // Code fences
    text = text.replace(
        /(\w+)?```([\s\S]*?)```/g,
        (codeContent) => {
            const lines = codeContent.split("\n");
            const heading = lines[0];
            const code = lines.slice(1).join("\n");
            return `<pre${heading ? ` data-heading="${heading}"` : ""}><code>${code.trim()}</code></pre>`;
        }
    );


    // Headings
    text = text.replace(
    /^(#{1,6})\s*(.+)$/gm,
    (_, hashes, content) => {
        const level = hashes.length;
        return `<h${level}>${content.trim()}</h${level}>`;
    }
    );

    // Horizontal rules
    text = text.replace(/^(?:\*\s*\*\s*\*|-\s*-\s*-|_\s*_\s_)\s*$/gm, '<hr/>');

    // Bold / italic / inline code / links
    text = text
    .replace(/```/g, '') // (already handled)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    // Paragraphs (wrap lines not already wrapped)
    text = text
    .split(/\n{2,}/)
    .map(block => {
        return block.match(/^<(h|ul|ol|blockquote|pre|hr)/)
        ? block
        : `<p>${block.trim()}</p>`;
    })
    .join('\n\n');

    return text;
}

async function sendPrompt() {
    const message = messageInputBox.value.trim();

    messageInputBox.value = "";

    const sentMessage = document.createElement("div");
    sentMessage.className = "sent";
    sentMessage.innerHTML = parseMarkdown(message);
    chatBox.appendChild(sentMessage);
    mainView.scrollTop = mainView.scrollHeight;

    // Create a div for the received message ahead of time
    const receivedMessage = document.createElement("div");
    receivedMessage.className = "received";
    chatBox.appendChild(receivedMessage);

    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gemma3:1b",
                prompt: message,
                stream: false,
            })
        });
        const data = await response.json();
        receivedMessage.innerHTML = parseMarkdown(data.response);
    } catch (error) {
        receivedMessage.innerHTML = parseMarkdown("Could not get a response from the model.\n```Error\n" + error + "```");
        receivedMessage.className = "system";
    }

    mainView.scrollTop = mainView.scrollHeight;
}

const messageInputBox = document.getElementById("prompt-input");
const chatBox = document.getElementById("chat-box");
const mainView = document.querySelector("main");

messageInputBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && messageInputBox.value.trim() ) {
        event.preventDefault();
        sendPrompt();
    }
});
