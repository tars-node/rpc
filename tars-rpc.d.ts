// Type defined by feihua

import { DyeingObject } from '@tars/dyeing'
import { EventEmitter } from 'events'
import { BinBuffer, Map, UniAttribute } from '@tars/stream'
import { Configure, Endpoint } from '@tars/utils'

export type Handle = new (...args: any[]) => any

export interface DeferedPromise<T> {
  promise: Promise<T>,
  resolve (value: T): void,
  reject (reason: any): void
}

export interface InvokeProperty {
  dyeing?: DyeingObject,
  context?: Record<string, string>,
  packetType?: 0 | 1,
  hashCode?: number,
  consistentHash?: string | number
}

export interface TarsCurrent {
  readonly application: HeroServer
  readonly communicator: Communicator

  /** 获取客户端的IP和端口 */
  getEndpoint (): Endpoint

  /** 仅 Tars 协议有效. 请求的协议的版本号 */
  getRequestVersion (): number

  /** 请求 ID */
  getRequestId (): number

  /** 仅 Tars 协议有效. 获取扩展 map */
  getContext (): Map<string, string>

  /** 仅Tars协议有效. 保存状态信息, 比如灰度、染色等 */
  getRequestStatus (): Map<string, string>

  /** 设置返回的 context */
  setResponseContext (context: Map<string, string>): void

  /** 获取原始的请求数据 */
  getRequest (): RequestPacket

  /** 适用于第三份协议时的回包函数 */
  sendResponse (...args: any[]): void

  /** 仅 Tars 协议有效. 开发者调用 `sendResponse`, 编码之后, 由框架调用该函数返回数据 */
  doResponse (binBuffer: BinBuffer): void

  /** 当出现错误时, 需要给个客户端返回一个错误消息是调用 */
  sendErrorResponse (iRet: number, sMessage?: string): void

  /** 获取原始请求的染色情况 */
  getDyeingObj (): DyeingObject
}

/** 响应包体 */
export interface ResponsePacket {
  iVersion: number,
  cPacketType: number,
  iRequestId: number
  iMessageType: number,
  iRet: number,
  sBuffer: BinBuffer,
  status: Map<string, string>,
  sResultDesc?: string,
  context?: Map<string, string>
}

/** 请求包体 */
export interface RequestPacket {
  iVersion: number,
  cPacketType: number,
  iMessageType: number,
  iRequestId: number,
  sServantName: string,
  sFuncName: string,
  sBuffer: BinBuffer,
  iTimeout: number,
  context: Map<string, string>,
  status: Map<string, string>
}

export interface ProtoMessageRequest {
  /** 业务需要发送的数据 */
  appBuffer: BinBuffer,

  /** 业务附加数据 */
  property: InvokeProperty,

  configure: Configure,
  iRequestId: number,
  sFuncName: string,
  sServantName: string
}

export interface ProtoMessageResponse {
  iRequestId: number,
  iResultCode: number,
  sResultDesc: string
}

export interface ReqMessage {
  request: ProtoMessageRequest,
  worker: ObjectProxy,
  promise: DeferedPromise<RpcResponse>,

  /** 请求超时定时器 */
  timer: any,

  adapter: AdapterProxy,
  property: InvokeProperty,

  /** 本次请求完成的时间, 单位毫秒 */
  costtime: number,

  /** 本次请求开始的内部时间点 */
  startTime: number,

  /** 本次调用本地地址 */
  LocalEndpoint: Endpoint,

  /** 本次调用远端地址 */
  RemoteEndpoint: Endpoint
}

export interface RspMessage {
  iRequestId: number,
  iResultCode: number,
  origin: ResponsePacket,
  sResultDesc: string
}

export interface RpcResponse {
  error?: IError,
  request: ReqMessage,
  response: ResponsePacket
}

export interface IError {
  code: number,
  message: string
}

export interface Response<Ret = any, Arg = any> {
  costtime: number,
  return: Ret,
  arguments: Arg
}

export interface ErrorResponse {
  costtime: number,
  error: IError
}

export interface ProxyResponse<Ret = any, Arg = any> {
  request: ReqMessage,
  response: Response<Ret, Arg>
}

export interface RpcError extends Error {
  request: ReqMessage
  response: ErrorResponse
}

export interface EndpointManagerOptions {
  bEnableConsistentHash?: boolean,
  vnodeNumber?: number
}

export interface CheckTimeoutInfo {
  /**
   * 计算的最小的超时次数, 默认 2 次
   * (在 `checkTimeoutInterval` 时间内超过了 `minTimeoutInvoke`, 才计算超时)
   */
  minTimeoutInvoke: number

  /** 统计时间间隔, (默认60s, 不能小于30s) */
  checkTimeoutInterval: number

  /** 连续失败次数 */
  frequenceFailInvoke: number

  minFrequenceFailTime: number

  /** 超时比例. 大于该值则认为超时了 (0.1 <= radio <= 1.0) */
  radio: number

  /** 重试时间间隔，单位毫秒 */
  tryTimeInterval: number
}

export type TQueueRawObject<T> = { [key: number]: T }
export interface TQueue<T> {
  readonly queue: TQueueRawObject<T>
  forEach (cb: (this: this, key: number, value: number, queue: TQueueRawObject<T>) => boolean | void): void
  push (id: number, value: T): void
  pop (id: number, earse?: boolean): T
  earse (id: number): void
  clear (): void
}

export interface ObjectProxy {
  communicator: Communicator
  timeout: number
  name: string
  version: number
  pTimeoutQueue: TQueue<ReqMessage>

  initialize (objName: string, setName: string, options?: EndpointManagerOptions): void
  setProtocol (protocol: ProtocolConstructor): void
  genRequestId (): number
  setCheckTimeoutINfo (checkTimeoutInfo: CheckTimeoutInfo): void
  doInvoke (): void
  doTimeout (reqMessage: ReqMessage): void
  doInvokeException (reqMessage: ReqMessage): void
  invoke (reqMessage: ReqMessage): Promise<RpcResponse>
  tars_invoke (funcName: string, binBuffer: BinBuffer, property?: InvokeProperty, functionInfo?: SharedFunctionInfo): Promise<RpcResponse>
  tup_invoke (funcName: string, uniAttribute: UniAttribute, property?: InvokeProperty, functionInfo?: SharedFunctionInfo): Promise<RpcResponse>
  setSyncInvokeFinish (bSync: boolean): void
  destroy (): void
}

export interface AdapterProxy {
  readonly worker: ObjectProxy
  readonly endpoint: Endpoint

  pushTimeoutQueueN (reqMessage: ReqMessage): void
  pushTimeoutQueueY (reqMessage: ReqMessage): void

  /** 初始化代理类，主要生成网络传输类的实例 */
  initialize (): void

  /**
   * 销毁当前的连接代理类, 在如下的时机:
   * 1. 该服务端被从主控去除之后
   * 2. 关闭当前的连接
   */
  destroy (): void

  /** 请求返回了, 并且 `Transceiver` 获得了一个完整的请求, 由 `Transceiver` 回调该接口 */
  doResponse (rspMessage: RspMessage): void

  /** 当在 `AdapterProxy` 内队列上的请求超时的时候, 调用当前函数 */
  doTimeout (reqMessage: ReqMessage): void

  /** 发送积压的数据. 当前代理类重新连接或者第一次连接上对端服务之后, 回调该函数 */
  doInvoke (): void

  invoke (reqMessage: ReqMessage): void

  /** 判断当前的接口代理实例是否可用 */
  checkActive (bForceConnect: boolean): boolean

  finishInvoke (iResultCode: number, reqMessage: ReqMessage): void
}

export interface StringToProxyOptions {
  bEnableConsistentHash?: boolean,
  vnodeNumber?: number
}

/** 通信器 */
export class Communicator {
  readonly configure: Configure
  readonly masterName: string

  /**
   * 使用配置文件初始化通信器
   * @param configFilePath 配置文件路径
   */
  initialize (configFilePath: string): void

  /**
   * 生成代理类接口
   * @param ProxyHandle 由 tars2node 生成的 Proxy 类
   * @param objName 被调服务名
   * @param setName 被调服务 set
   * @param options 额外选项
   */
  stringToProxy<T extends Handle> (ProxyHandle: T, objName: string, setName?: string, options?: StringToProxyOptions): InstanceType<T>

  /** 析构当前的通信器 */
  destroy (): void

  /** 析构当前的通信器 */
  disconnect (): void

  /** 设置通信器的属性值 */
  setProperty (key: string, value: any): void

  /**
   * 获取通信器的属性值
   * @param key 要获取的属性 key
   * @param defaultValue 读不到该属性时使用的默认值
   */
  getProperty<T> (key: string, defaultValue?: T): T

  /** 更新 locator */
  bindUpdateLocatorEvent (): void

  /** 创建一个通信器 */
  static New (): Communicator
}

export interface RequestParams {
  /** 框架生成的请求序列号 */
  iRequestId: number,

  /** 函数名称 */
  sFuncName: string,

  /** 函数的参数列表 */
  Arguments: any[]
}

export type ProtocolConstructor = new (...args: any[]) => Protocol
export interface Protocol extends EventEmitter {
  readonly name: string,

  /** 根据传入数据进行打包的方法 */
  compose (params: RequestParams): Buffer,

  /**
   * 网络收取包之后, 填入数据判断是否完整包
   * @param data 传入的 `data` 数据可能是 TCP 的各个分片, 不一定是一个完整的数据请求, 协议解析类内部做好数据缓存工作
   */
  feed (data: BinBuffer): void,

  /** 重置当前协议解析器 */
  reset (): void,

  emit (event: 'message', params: RequestParams): boolean,
  on (event: 'message', listener: (params: RequestParams) => void): this
}

/** 监听端口功能包裹类 */
export interface BindAdapterOptions {
  /** 当前 BindAdapter 的名字 */
  name?: string,

  /** 当前 BindAdapter 上的 Servant 的名字 */
  servant?: string,

  /** 当前 BindAdapter 的监听地址, 比如 `tcp -h 127.0.0.1 -p 14002 -t 10000` */
  endpoint?: string,

  /** 当前 BindAdapter 上可以支持的最大链接数 */
  maxconns?: number,

  /** 当前 BindAdapter 上的协议解析器, 如果不设置或者为 `tars` 则默认为 Tars 协议 */
  protocol?: 'tars' | ProtocolConstructor,

  /** 当前 BindAdapter 上的协议解析器的名字 */
  protocolName?: string,

  /** 当前 BindAdapter 上的请求处理类 */
  handleImp?: Handle
}

export interface ServantConfig {
  endpoint: string,
  handlegroup: string,
  maxconns: string,
  protocol: 'tars' | 'not_tars',
  queuecap: string,
  queuetimeout: string,
  servant: string,
  shmcap: string,
  shmkey: string,
  threads: string
}

export interface SimpleServer {
  /** 启动服务 */
  start (options: BindAdapterOptions): Promise<any[]>
  start (options: ServantConfig): Promise<any[]>

  /** 停止服务 */
  stop (): void
}

export interface HeroServer {
  Application: string
  ServerName: string
  readonly communicator: Communicator
  readonly configure: Configure

  /** 使用配置文件初始化服务 */
  initialize (sConfigFile?: string, initFunction?: (server: this) => any): void

  /** 为服务 Servant 增加处理类 */
  addServant (ServerHandle: Handle, serverName: string): void

  /** 启动服务 */
  start (options?: BindAdapterOptions): Promise<any[]>
  start (options: ServantConfig): Promise<any[]>

  /** 停止服务 */
  stop (): void
}

export interface HeroServerStatic {
  new (): HeroServer

  /** 创建一个 BindAdapter 的参数 */
  BindAdapterOption (): BindAdapterOptions

  createServer (): HeroServer
  createServer (HandleImp: Handle): SimpleServer

  getServant (sConfigFile?: string, servantName?: string): ServantConfig[]
}

export class ServantProxy {
  readonly rpc: any
  setTimeout (iTimeout: number): void
  setProtocol (protocol: ProtocolConstructor): void
  rpc_call (requestId: number, funcName: string, appBuffer: any): Promise<RpcResponse>
}

export interface SharedArgumentInfo {
  name: string,
  class: string,
  direction: 'in' | 'out'
}

export interface SharedFunctionInfo {
  name: string,
  return: string,
  arguments: SharedArgumentInfo[]
}

export const server: HeroServerStatic
export const client: Communicator
export const error: {
  SUCCESS: 0,
  SERVER: {
    DECODE_ERROR: -1,
    ENCODE_ERROR: -2,
    FUNC_NOT_FOUND: -3,
    SERVANT_NOT_FOUND: -4,
    QUEUE_TIMEOUT: -6,
    TARSSERVEROVERLOAD: -9,
    TARSADAPTERNULL: -10
  },
  CLIENT: {
    ADAPTER_NOT_FOUND: -10000,
    DECODE_ERROR: -11000,
    CONN_CLOSED: -12001,
    COON_ERROR: -12002,
    REQUEST_TIMEOUT: -13001
  }
}

export { Promise as promise } from '@tars/utils'