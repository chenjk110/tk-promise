type OnFulfilled = (result?: any) => any
type OnRejected = (result?: any) => any
type OnFinally = (result?: any) => void
type ExecutorFn = (resolve: OnFulfilled, reject: OnRejected) => void
type CbMatch = Array<undefined | Function>
type CbChains = Array<CbMatch>


/**
 * No Operation
 */
const noop = () => { }

/**
 * next-tick
 * @param callback callbacks
 */
function nextTick(callback: Function) {
    /// next tick adapter
    return setTimeout(callback, 0)
}

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
    // end of chains
    if (!chains.length) {
        // run finally callback
        if (typeof target.cbFinally === 'function') {
            return target.cbFinally(target.value)
        }
        // esle return directly
        return
    }

    const [onFulfilld, onRejected] = chains[0] || []

    let callback

    if (isResolved) {
        if (typeof onFulfilld === 'undefined') {
            return nextTick(() => executeCbChains(target, isResolved, result, chains.slice(1)))
        }
        callback = onFulfilld
    } else {
        if (typeof onRejected === 'undefined') {
            return nextTick(() => executeCbChains(target, isResolved, result, chains.slice(1)))
        }
        callback = onRejected
    }

    const res = safeExecute(callback, result, target)

    if (res instanceof TKPromise) {
        res.cbChains = res.cbChains.concat(target.cbChains.slice(1))
        res.cbFinally = target.cbFinally
        return
    }

    // new promise instance
    const p = new TKPromise(noop)

    p.cbChains = target.cbChains.slice(1)
    p.cbFinally = target.cbFinally

    if (res instanceof Error) {
        // combine callback chains
        return handleReject(res, p)
    }

    return handleResolve(res, p)
}

function handleResolve(result: any, context: TKPromise): void {
    if (context.state === 'settled') return
    context.state = 'settled'
    context.value = result
    nextTick(() => executeCbChains(context, true, result, context.cbChains))
}

function handleReject(result: any, context: TKPromise): void {
    if (context.state === 'settled') return
    context.state = 'settled'
    context.value = result
    nextTick(() => executeCbChains(context, false, result, context.cbChains))
}

function noramlizeThenHandler(handler: any) {
    return typeof handler === 'function' ? handler : undefined
}


class TKPromise {
    state: 'pendding' | 'settled' = 'pendding'
    value: any
    cbChains: CbChains = []
    cbFinally: OnFinally = noop

    constructor(executor: ExecutorFn) {
        if (!(this instanceof TKPromise)) {
            throw new Error('TKPromise should called via `new` operator.')
        }

        if (typeof executor !== 'function') {
            throw new TypeError(
                'the first parameter of constructor should be a function.',
            )
        }

        executor((result) => handleResolve(result, this), (reason) => handleReject(reason, this))
    }

    static race(promises: TKPromise[]) {
        let done = false
        const p = new TKPromise(noop)

        const _handlerResove = function (res: any) {
            if (done) return
            done = true
            promises.forEach((pItem) => (pItem.state = 'settled'))
            handleResolve(res, p)
        }

        const _handleReject = function (res: any) {
            if (done) return
            done = true
            promises.forEach((pItem) => (pItem.state = 'settled'))
            handleReject(res, p)
        }

        promises.forEach((pItem) => pItem.then(_handlerResove, _handleReject))

        return p
    }

    static all(promises: TKPromise[]) {
        const p = new TKPromise(noop)
        const values: any[] = []

        const _handleResolve = function (idx: number, res: any) {
            values[idx] = res
            if (values.length === promises.length) {
                handleResolve(values, p)
            }
        }

        const _handleReject = function (res: any) {
            handleReject(res, p)
            promises.forEach((pItem) => pItem.state === 'settled')
        }

        promises.forEach((pItem, idx) =>
            pItem.then(_handleResolve.bind(undefined, idx), _handleReject),
        )

        return p
    }

    static allSettled(promises: TKPromise[]) {
        const values: any[] = []
        const p = new TKPromise(noop)

        const handleResolveReject = function (idx: number, res: any) {
            values[idx] = res
            if (values.length === promises.length) {
                handleResolve(values, p)
            }
        }

        promises.forEach((pItem, idx) =>
            pItem.then(
                handleResolveReject.bind(undefined, idx),
                handleResolveReject.bind(undefined, idx),
            ),
        )

        return p
    }

    static resolve(value?: any): TKPromise {
        return new TKPromise((resolve) => resolve(value))
    }

    static reject(value?: any): TKPromise {
        return new TKPromise((_, reject) => reject(value))
    }

    public then(onFulfilld?: OnFulfilled, onRejected?: OnRejected): TKPromise {
        onFulfilld = noramlizeThenHandler(onFulfilld)
        onRejected = noramlizeThenHandler(onRejected)

        const cbMatch: CbMatch = [onFulfilld, onRejected]
        this.cbChains.push(cbMatch)
        return this
    }

    public catch(onRejected: OnRejected): TKPromise {
        onRejected = noramlizeThenHandler(onRejected)
        const cbMatch: CbMatch = [undefined, onRejected]
        this.cbChains.push(cbMatch)
        return this
    }

    public finally(onFinally: OnFinally): void {
        if (typeof onFinally !== 'function') {
            throw new TypeError('`onFinally` should be a function.')
        }

        // only register once
        if (this.cbFinally !== noop) return

        // assign `onFinally`
        this.cbFinally = onFinally
    }
}

export default TKPromise
