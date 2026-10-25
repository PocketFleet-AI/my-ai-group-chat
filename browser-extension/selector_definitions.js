/* Built-in offline fallback. Ordered entries match the pinned adapter profiles. */
globalThis.FEATURE_SELECTOR_DEFINITIONS = Object.freeze(
[
  {
    "editor": [
      "div.ProseMirror[data-composer-markdown]",
      "[data-composer-input] div.ProseMirror",
      "div.ProseMirror[aria-label='询问 ChatGPT']",
      "div.ProseMirror[aria-label*='ChatGPT']",
      "#prompt-textarea[contenteditable='true']",
      "#prompt-textarea",
      "div#prompt-textarea",
      "textarea#prompt-textarea",
      "[data-testid='prompt-textarea']",
      "form div.ProseMirror[contenteditable='true']",
      "form [contenteditable='true'][role='textbox']",
      "[class*='composer'] div.ProseMirror[contenteditable='true']",
      "textarea[placeholder*='ChatGPT']",
      "textarea[placeholder*='询问']"
    ],
    "userMessages": [
      "[data-message-author-role='user']",
      "[data-user-message-bubble='true']",
      "[data-chatgpt-search-unit-key*=':user']",
      "[data-conversation-role='user']"
    ],
    "assistantMessages": [
      "[data-message-author-role='assistant']",
      "[data-markdown-text-style='assistant-message']",
      "[data-chatgpt-search-unit-key*=':assistant']",
      "[class*='MarkdownRoot']",
      "div:has(> [data-conversation-role='assistant'])",
      "div:has(> [data-chatgpt-agent-turn-start])",
      "article[data-testid^='conversation-turn-']:not(:has([data-message-author-role='user']))",
      "[data-testid*='assistant']",
      ".agent-turn",
      "[class*='agent-turn']",
      ".markdown.prose",
      ".markdown"
    ],
    "generation": [
      "button[data-testid='stop-button']",
      "button[aria-label*='Stop']",
      "button[aria-label*='停止']"
    ],
    "completedActions": [
      "button[data-testid='copy-turn-action-button']",
      "button[aria-label*='Copy' i]",
      "button[aria-label*='复制' i]",
      "button[data-testid='good-response-turn-action-button']",
      "button[data-testid*='action']"
    ],
    "submit": [
      "button[type='submit'][aria-label='发送']",
      "button[type='submit'][aria-label='Send']",
      "button[type='submit'].bg-composer-primary",
      "button[type='submit']:has(svg.icon-primary-action)",
      "button[type='submit']:has(path[d*='M9.33467'])",
      "button[type='submit']",
      "button[aria-label='发送']",
      "button[aria-label='Send']",
      "button[data-testid='send-button']",
      "button[data-testid='composer-submit-button']",
      "button[data-testid*='send']",
      "button[data-testid*='submit']",
      "button[aria-label*='Prompt']",
      "button[aria-label*='提示']",
      "[data-composer-footer-responsive] button[type='submit']",
      "[class*='ComposerLayoutFooter'] button[type='submit']"
    ]
  },
  {
    "editor": [
      "div.ProseMirror[contenteditable='true']",
      "div[contenteditable='true'][role='textbox']",
      "div[contenteditable='true']",
      "fieldset div[contenteditable='true']"
    ],
    "userMessages": [
      "[data-test-render-count] .font-user-message",
      "[class*='font-user-message']",
      "[class*='UserMessage']",
      "[data-testid='user-message']"
    ],
    "assistantMessages": [
      ".font-claude-message",
      "[class*='font-claude-message']",
      "[data-testid='assistant-message']",
      "[class*='ChatMessage']:not(:has([class*='font-user-message']))",
      ".standard-markdown"
    ],
    "generation": [
      "button[aria-label*='Stop response']",
      "button[aria-label*='Stop generating']",
      "button[aria-label*='停止生成']",
      "button[data-testid='stop-button']"
    ],
    "submit": [
      "button[aria-label*='Send Message']",
      "button[aria-label*='发送消息']",
      "button[aria-label*='Send']",
      "button[aria-label*='发送']"
    ]
  },
  {
    "editor": [
      "textarea.message-input-textarea"
    ],
    "userMessages": [
      ".chat-user-message-container",
      ".chat-user-message",
      "[class*='user-message']"
    ],
    "assistantMessages": [
      ".response-message-content",
      ".chat-response-message-render-flow",
      ".custom-qwen-markdown",
      ".qwen-chat-message.qwen-chat-message-assistant",
      ".qwen-chat-message",
      "[class*='assistant-message']"
    ],
    "generation": [
      "button.stop-button",
      "button[aria-label*='Stop']",
      "button[aria-label*='停止']",
      "button[class*='stop']",
      ".anticon-pause"
    ],
    "submit": [
      "button.send-button",
      "button[aria-label='发送']",
      "button[aria-label*='发送']",
      "button[type='submit']"
    ]
  },
  {
    "editor": [
      ".guidance-input-editor-wrapper div.tiptap.ProseMirror[contenteditable='true']",
      "div.tiptap.ProseMirror[contenteditable='true']",
      ".guidance-input-editor-wrapper div.tiptap.ProseMirror[contenteditable='true'][role='textbox']",
      "div.yc-editor[contenteditable='true']",
      "[data-testid='chat_input_input'][contenteditable='true']",
      "textarea[data-testid='chat_input_input']"
    ],
    "userMessages": [
      "[class*='bg-g-send-msg-bubble']",
      "[data-testid='send_message']"
    ],
    "assistantMessages": [
      "[data-reply-message='true'] .md-box-root[data-streaming]",
      "[class*='bg-g-receive-msg-bubble']",
      "[data-testid='receive_message']",
      "[data-testid='message_text_content']",
      ".flow-markdown-body",
      "[class*='receive-msg']"
    ],
    "generation": [
      "button[data-testid='stop_generation']",
      "button[aria-label*='停止生成']",
      "button[aria-label*='Stop generating']",
      "button[aria-label*='Stop response']"
    ],
    "submit": [
      "#flow-end-msg-send",
      "button[class*='g-send-msg-btn']",
      "#sendBtn",
      "button[data-testid='chat_input_send_button']",
      "button[aria-label*='发送']",
      "button[type='submit']"
    ]
  },
  {
    "editor": [
      "#search-input-box textarea",
      ".input-box-inner textarea",
      "textarea.scroll-display-none",
      "#search-input-box [contenteditable='true']",
      "textarea[placeholder*='和我聊聊天吧']",
      "textarea[placeholder*='输入']",
      "textarea.chat-input",
      "div.chat-input[contenteditable='true']",
      "div[contenteditable='true']",
      "textarea"
    ],
    "userMessages": [
      ".user-message",
      "[class*='user-message']",
      "[data-role='user']",
      ".chat-item.user",
      ".bubble.user"
    ],
    "assistantMessages": [
      ".conversation-item",
      "[class*='conversation-item']",
      ".chat-item.assistant",
      "[class*='assistant-message']",
      ".assistant-message",
      "[data-role='assistant']",
      "[class*='bot-message']",
      "[class*='model-message']",
      "[class*='agent-message']",
      ".bubble.assistant",
      ".markdown-body",
      "[class*='markdown-body']"
    ],
    "generation": [
      ".stop-btn",
      ".enter-icon-container.stop",
      ".enter.stop",
      ".enter.searching",
      ".enter.is-main-chat.searching",
      "button[aria-label*='停止']",
      "button.stop-generate"
    ],
    "submit": [
      ".enter.is-main-chat .enter-icon-container",
      ".enter-icon-container",
      ".enter.is-main-chat",
      ".enter",
      ".enter_icon",
      ".send-btn",
      "button[aria-label*='发送']",
      "button.enter-btn",
      "button[type='submit']"
    ]
  },
  {
    "editor": [
      "rich-textarea div.ql-editor[contenteditable='true']",
      "div.ql-editor[contenteditable='true']",
      "div.ql-editor.textarea",
      "div.ql-editor[aria-label*='Gemini']",
      "rich-textarea div.ql-editor",
      "rich-textarea div[contenteditable='true']:not(.ql-clipboard)",
      "[role='textbox'][contenteditable='true']:not(.ql-clipboard)",
      "rich-textarea .ql-editor",
      "textarea"
    ],
    "userMessages": [
      "user-query",
      "[data-test-id='user-query']",
      ".user-query-container",
      ".user-query",
      ".query-text"
    ],
    "assistantMessages": [
      "model-response",
      "[data-test-id='model-response']",
      ".response-container",
      ".model-response-text",
      ".response-content",
      ".markdown"
    ],
    "generation": [
      "button[aria-label*='Stop']",
      "button[aria-label*='停止']",
      ".stop-button",
      "button.stop-generate"
    ],
    "completedActions": [
      "button[aria-label*='复制' i]",
      "button[aria-label*='Copy' i]",
      "button[aria-label*='分享' i]",
      "button[aria-label*='Share' i]",
      "button[data-test-id*='copy']",
      ".response-footer button",
      "message-actions button"
    ],
    "submit": [
      "button[aria-label*='发送提示']",
      "button[aria-label*='Send prompt']",
      "button[aria-label*='发送']",
      "button[aria-label*='Send']",
      "button.send-button",
      "[data-test-id='send-button']",
      "button:has(mat-icon[fonticon='send'])",
      "button:has(mat-icon[fonticon='arrow_upward'])",
      "button:has([data-mat-icon-name='send'])",
      "button:has([data-mat-icon-name='arrow_upward'])",
      "button[mattooltip*='发送']",
      "button[mattooltip*='Send']",
      "button[type='submit']"
    ]
  },
  {
    "editor": [
      "textarea#userInput",
      "textarea[data-testid='chat-input-input']",
      "div[data-testid='chat-input-input']",
      "textarea[placeholder*='Ask']",
      "textarea[placeholder*='输入']",
      "textarea[placeholder*='问题']",
      "div[contenteditable='true']",
      "textarea"
    ],
    "userMessages": [
      "[data-content='user-message']",
      ".user-message",
      "[data-author='user']",
      "div[class*='user-message']",
      "[data-role='user']"
    ],
    "assistantMessages": [
      "[data-testid='ai-message-body']",
      "[data-testid*='ai-message']",
      "[data-testid*='response']",
      "[data-message-author-role='assistant']",
      "[class*='ai-message-item']",
      "[data-content='ai-message']",
      ".ai-message",
      "[data-author='bot']",
      "div[class*='bot-message']",
      "[data-role='assistant']",
      "[class*='markdown']",
      ".markdown",
      ".markdown-body"
    ],
    "generation": [
      "button[aria-label*='Stop']",
      "button[aria-label*='停止']",
      "button.stop-generating",
      "button[data-testid*='stop']"
    ],
    "submit": [
      "button[aria-label*='Submit']",
      "button[aria-label*='发送']",
      "button[aria-label*='Send']",
      "button[aria-label*='提交']",
      "button[title*='Submit']",
      "button[title*='Send']",
      "button[title*='发送']",
      "button[data-testid='submit-button']",
      "button[data-testid='composer-submit-button']",
      "button[data-testid='send-button']",
      "button[data-testid*='submit']",
      "button[data-testid*='send']",
      "button[type='submit']"
    ]
  },
  {
    "editor": [
      "textarea#chat-input",
      "textarea[placeholder*='DeepSeek']",
      "textarea[placeholder*='输入']",
      "textarea"
    ],
    "userMessages": [
      "[class*='user-message']",
      "[data-role='user']",
      ".fbb737a4"
    ],
    "assistantMessages": [
      ".ds-assistant-message-main-content",
      ".ds-markdown.ds-assistant-message-main-content",
      "[class*='assistant-message-main-content']",
      ".ds-message .ds-markdown:not(.ds-think-content *):not([class*='think'] *):not([class*='thought'] *)",
      "[class*='assistant-message']:not(.ds-think-content *):not([class*='think'] *)",
      "[data-role='assistant']:not(.ds-think-content *):not([class*='think'] *)",
      ".markdown-body:not(.ds-think-content *)",
      "div[class*='markdown']:not(.ds-think-content *)"
    ],
    "generation": [
      "button[aria-label*='Stop']",
      "button[aria-label*='停止']",
      "button.ds-icon-button[aria-label*='停止']"
    ],
    "submit": [
      "div[role='button'].ds-button--primary:has(svg)",
      "div[role='button'].ds-button--circle:has(svg)",
      "div[role='button'].ds-button--filled.ds-button--circle",
      ".ds-button--circle",
      "button[type='submit']",
      "button[aria-label*='发送']",
      "button[aria-label*='Send']",
      "div[role='button']:has(svg)",
      "button"
    ]
  },
  {
    "editor": [
      "div[contenteditable='true'].chat-input-editor",
      "div[contenteditable='true']",
      "textarea"
    ],
    "userMessages": [
      "[class*='user-message']",
      "[data-role='user']"
    ],
    "assistantMessages": [
      "[class*='assistant-message']",
      "[data-role='assistant']",
      ".markdown"
    ],
    "generation": [
      "button[aria-label*='停止']",
      "button[aria-label*='Stop']"
    ],
    "submit": [
      "button[aria-label*='发送']",
      "button[aria-label*='Send']",
      "button[type='submit']"
    ]
  },
  {
    "editor": [
      "textarea.ant-input",
      "textarea",
      "div[contenteditable='true']",
      ".chat-input"
    ],
    "userMessages": [
      "[class*='user-message']",
      ".user-item"
    ],
    "assistantMessages": [
      "[class*='assistant-message']",
      ".assistant-item",
      ".markdown"
    ],
    "generation": [
      "button[aria-label*='停止']",
      "button[aria-label*='Stop']"
    ],
    "submit": [
      "button[aria-label*='发送']",
      "button[type='submit']",
      ".send-button"
    ]
  },
  {
    "editor": [
      "div[aria-label*='向 Grok 提任何问题']",
      "div[role='combobox'].query-bar-editor",
      "textarea[placeholder*='Ask Grok']",
      "textarea[placeholder*='Ask anything']",
      "textarea[aria-label*='Ask Grok']",
      "div[contenteditable='true']",
      "textarea"
    ],
    "userMessages": [
      "div.message-bubble:not(:has(.prose))",
      "div[data-testid*='user']",
      "div[class*='user-message']",
      "div[class*='user']:not([class*='response'])"
    ],
    "assistantMessages": [
      "div.prose",
      "div.message-bubble:has(.prose)",
      "div[class*='response-message']",
      "div[class*='response']:not([class*='user'])",
      "[data-testid*='assistant']"
    ],
    "generation": [
      "button[aria-label*='停止模型响应' i]",
      "button[aria-label*='Stop' i]",
      "button[aria-label*='停止' i]",
      "button.stop-button",
      "[data-testid*='stop']"
    ],
    "completedActions": [
      "button[aria-label*='复制响应' i]",
      "button[aria-label*='Regenerate' i]",
      "button[aria-label*='Retry' i]",
      "button[aria-label*='重新生成' i]",
      "button[aria-label*='Copy' i]",
      "button[aria-label*='复制' i]"
    ],
    "submit": [
      "button[data-testid='chat-submit']",
      "button[aria-label='提交']",
      "button[type='submit']"
    ]
  }
]
.map(rules => Object.freeze(Object.fromEntries(Object.entries(rules).map(([key, values]) => [key, Object.freeze(values)])))));

// Structural safety filters stay local; future remote data cannot relax them.
globalThis.FEATURE_STRUCTURAL_SELECTORS = Object.freeze({
  geminiRoots: "model-response, [data-test-id='model-response']",
  geminiReplyBody: ".model-response-text, .response-content .markdown, .markdown",
  doubaoPendingQueue: "[data-item-id^='queue-item-'][data-item-status='Pending']",
  doubaoStreaming: "[data-streaming='true'], [data-streaming='1'], .md-box-root[data-streaming='true']",
  messageActionBars: ".message-action-button-main, [data-testid='message_action_copy'], [data-testid='audio_play_button'], [data-testid^='message_action_'], [class*='message-action-'], [class*='message-action']",
  completedActionBars: "[data-foundation-type='receive-message-action-bar'], [data-testid='message_action_bar'], [data-testid='copy-turn-action-button'], [data-testid='message_action_copy'], button[aria-label*='复制'], button[aria-label*='Copy'], button[aria-label*='重新生成'], .ds-actions, div[class*='toolBar'], div[class*='actionBar']",
  stopButtons: "button[data-testid*='stop'], button[aria-label*='停止生成'], button[aria-label*='Stop generating'], button[aria-label*='Stop response'], button[aria-label*='停止'], button.stop-button, div[class*='stop-btn']",
  errorIndicators: ".limit-card, [class*='error-card'], div[class*='error-tip'], [data-testid*='error'], .text-token-text-error, .text-danger",
  cancelIndicators: "[data-testid='stopped_notice'], [aria-label*='已停止']",
  legacyMessages: ".markdown-body, [class*='markdown'], [class*='conversation'], [class*='message'], [class*='bubble'], [class*='content'], article, pre",
  replyChrome: ".sr-only, [class*='sr-only'], [role='toolbar'], [data-testid*='reaction'], button, .ds-think-content, [class*='think-content'], [class*='thinking'], [class*='think'], [class*='thought'], [class*='reasoning'], details, summary, .message-node-cot-summary, [data-message-selection-module='thinking_progress'], [data-plugin-identifier*='thinking_block'], .message-action-button-main, [data-testid^='message_action_'], [class*='message-action'], .response-message-footer, [class*='response-message-footer'], .qwen-chat-thinking-tool-status-card-wraper",
});
