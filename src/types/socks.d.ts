declare module 'socks' {
  export interface SocksProxy {
    host: string
    port: number
    type: 4 | 5
    userId?: string
    password?: string
  }

  export interface SocksDestination {
    host: string
    port: number
  }

  export interface SocksClientOptions {
    proxy: SocksProxy
    command: 'connect' | 'bind' | 'associate'
    destination: SocksDestination
    timeout?: number
    set_tcp_nodelay?: boolean
  }

  export interface SocksClientCreatedInfo {
    socket: import('net').Socket
    remoteHost: SocksDestination
  }

  export class SocksClient {
    static createConnection(options: SocksClientOptions): Promise<SocksClientCreatedInfo>
    static createConnectionChain(options: SocksClientOptions[]): Promise<SocksClientCreatedInfo>
    static createUDPFrame(options: any): Buffer
    static parseUDPFrame(buffer: Buffer): any
  }

  export class SocksClientError extends Error {}
}
