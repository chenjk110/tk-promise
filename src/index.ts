type OnFulfilled = (result?: any) => any
type OnRejected = (result?: any) => any
type ExecutorFn = (resolve: OnFulfilled, reject: OnRejected) => void
type CbMatch = Array<undefined | Function>
type CbChains = Array<CbMatch>

/**
 * No Operation
 */
const noop = () => {}

/**
 * execute function via try-catch
 * @param fn target function to be executed
 * @param result the data that will be pass in
 * @param ctx executing context
 */
function safeExecute(fn: Function, result: any, ctx: any) {
    try {
        return fn.call(ctx, result)
    } catch (err) {
        return err
    }
}

/**
 * exectue promise instance callbacks
 * @param target the promise instance
 * @param isResolved stand for resolved state
 * @param result the result of previous promise instance
 * @param chains promise instance's callback chains that registed
 */
function executeCbChains(
    target: TKPromise,
    isResolved: boolean,
    result: any,
    chains: CbChains,
): any {
    if (!chains.length) return
    const [onFulfilld, onRejected] = chains[0]

    let callback

    if (isResolved) {
        if (typeof onFulfilld === 'undefined') {
            return executeCbChains(target, isResolved, result, chains.slice(1))
        }
        callback = onFulfilld
    } else {
        if (typeof onRejected === 'undefined') {
            return executeCbChains(target, isResolved, result, chains.slice(1))
        }
        callback = onRejected
    }

    const res = safeExecute(callback, result, target)

    if (typeof res === 'undefined') {
        return executeCbChains(target, isResolved, target['value'], chains.slice(1))
    }

    if (res instanceof TKPromise) {
        res['cbChains'] = res['cbChains'].concat(target['cbChains'].slice(1))
        return setTimeout(
            () => executeCbChains(target, isResolved, target['value'], chains.slice(1)),
            0,
        )
    }

    // new promise instance
    const p = new TKPromise(noop)

    if (res instanceof Error) {
        // combine callback chains
        p['cbChains'] = target['cbChains'].slice(1)
        return setTimeout(p['handleReject'].bind(p, res), 0)
    }

    return setTimeout(p['handleResolve'].bind(p, res), 0)
}

class TKPromise {
    private state: 'pendding' | 'settled' = 'pendding'
    private value: any
    private cbChains: CbChains = []

    private handleResolve(result?: any): void {
        if (this.state === 'settled') return
        this.state = 'settled'
        this.value = result
        setTimeout(() => executeCbChains(this, true, result, this.cbChains), 0)
    }

    private handleReject(result?: any): void {
        if (this.state === 'settled') return
        this.state = 'settled'
        this.value = result
        setTimeout(() => executeCbChains(this, false, result, this.cbChains), 0)
    }

    constructor(executor: ExecutorFn) {
        if (!(this instanceof TKPromise)) {
            throw new Error('TKPromise should called via `new` operator.')
        }

        if (typeof executor !== 'function') {
            throw new TypeError(
                'the first parameter of constructor should be a function.',
            )
        }

        executor.call(this, this.handleResolve.bind(this), this.handleReject.bind(this))
    }

    static race(promises: TKPromise[]) {
        let done = false
        const p = new TKPromise(noop)

        const handlerResove = function (res: any) {
            if (done) return
            done = true
            promises.forEach((p) => (p['state'] = 'settled'))
            p.handleResolve(res)
        }

        const handleReject = function (res: any) {
            if (done) return
            done = true
            promises.forEach((p) => (p['state'] = 'settled'))
            p.handleReject(res)
        }

        promises.forEach((p) => p.then(handlerResove, handleReject))

        return p
    }

    static all(promises: TKPromise[]) {
        const p = new TKPromise(noop)
        const values: any[] = []

        const handleResolve = function (idx: number, res: any) {
            values[idx] = res
            if (values.length === promises.length) {
                p.handleResolve(values)
            }
        }

        const handleReject = function (res: any) {
            p.handleReject(res)
            promises.forEach((p) => p['state'] === 'settled')
        }

        promises.forEach((p, idx) => p.then(handleResolve.bind(null, idx), handleReject))

        return p
    }

    static resolve(value?: any): TKPromise {
        return new TKPromise((resolve) => resolve(value))
    }

    static reject(value?: any): TKPromise {
        return new TKPromise((_, reject) => reject(value))
    }

    public then(onFulfilld: OnFulfilled, onRejected?: OnRejected): TKPromise {
        const cbMatch: CbMatch = [onFulfilld, onRejected]
        this.cbChains.push(cbMatch)
        return this
    }

    public catch(onRejected: OnRejected): TKPromise {
        const cbMatch: CbMatch = [undefined, onRejected]
        this.cbChains.push(cbMatch)
        return this
    }
}

export default TKPromise
