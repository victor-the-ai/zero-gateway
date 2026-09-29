import { ChatMessage, ChatCompletionRequest, ChatCompletionResponse } from "./models.js";
import { ZeroGatewayRouter, RouterOptions } from "./router.js";

export class ChatCompletions {
  private router: ZeroGatewayRouter;

  constructor(router: ZeroGatewayRouter) {
    this.router = router;
  }

  public async create(
    params: {
      model: string;
      messages: ChatMessage[];
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
      stream?: false;
      stop?: string | string[];
      [key: string]: any;
    }
  ): Promise<ChatCompletionResponse>;

  public async create(
    params: {
      model: string;
      messages: ChatMessage[];
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
      stream: true;
      stop?: string | string[];
      [key: string]: any;
    }
  ): Promise<AsyncGenerator<string, void, unknown>>;

  public async create(
    params: ChatCompletionRequest
  ): Promise<ChatCompletionResponse | AsyncGenerator<string, void, unknown>> {
    if (params.stream) {
      return this.router.streamChatCompletion(params);
    }
    return this.router.executeChatCompletion(params);
  }
}

export class Chat {
  public completions: ChatCompletions;

  constructor(router: ZeroGatewayRouter) {
    this.completions = new ChatCompletions(router);
  }
}

export interface ClientOptions extends RouterOptions {
  registryUrl?: string;
}

export class ZeroGatewayClient {
  public router: ZeroGatewayRouter;
  public chat: Chat;

  constructor(options: ClientOptions = {}) {
    this.router = new ZeroGatewayRouter(options);
    this.chat = new Chat(this.router);
  }

  public listModels() {
    return this.router.registry.getAllModels();
  }

  public listActiveProviders(): string[] {
    return this.router.getConfiguredProviders().map((p) => p.name);
  }
}

export const FreeLLMClient = ZeroGatewayClient;
