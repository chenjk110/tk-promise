'use strict'
type AnyFunc = (...args: any[]) => any
type OnFulfilled = (result?: any) => any
type OnRejected = (reason?: any) => any
type OnFinally = (result?: any) => void
type ExecutorFn = (resolve: OnFulfilled, reject: OnRejected) => void
type CbMatch = Array<undefined | AnyFunc>
type CbChains = Array<CbMatch>
type States = 'pending' | 'fulfilled' | 'rejected'

/**
 * No Operation
 */
const noop: AnyFunc = Object.freeze(() => (void 0))

/**
 * next-tick
 * @param callback callbacks
 */
function nextTick(callback: AnyFunc) {
    /// next tick adapter
    return setTimeout(callback, 0)
}

/**
 * execute function via try-catch
 * @param fn target function to be executed
 * @param payload the data that will be passed in
 * @param ctx executing context
 */
function safeExecute(fn: AnyFunc, payload: any, ctx: any) {
    try {
        return fn.call(ctx, payload)
    } catch (err) {
        return err
    }
}
/**
 * exectue promise instance callbacks
 * @param target the promise instance
 * @param isResolved stand for resolved state
 * @param payload the result of previous promise instance
 * @param chains promise instance's callback chains that registed
 */
function executeCbChains(
    target: TKPromise,
    isResolved: boolean,
    payload: any,
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

    let callback = noop

    if (isResolved) {
        if (typeof onFulfilld === 'undefined') {
            return nextTick(executeCbChains.bind(undefined, target, isResolved, payload, chains.slice(1)))
        }
        callback = onFulfilld
    } else {
        if (typeof onRejected === 'undefined') {
            return nextTick(executeCbChains.bind(undefined, target, isResolved, payload, chains.slice(1)))
        }
        callback = onRejected
    }

    ///// executing callback and got result
    let thenResult = safeExecute(callback, payload, undefined)

    if (thenResult instanceof TKPromise) {
        // assign finally callback
        thenResult.finally(target.cbFinally)

        if (thenResult === target) {
            const isResolved = false
            const payload = new TypeError(`promise and value refer to the same object.`)
            const cbChains = chains.slice(1)
            return nextTick(executeCbChains.bind(undefined, thenResult, isResolved, payload, cbChains))
        }

        if (thenResult.state !== 'pending') {
            const isResolved = thenResult.state === 'fulfilled'
            const payload = thenResult.value
            const cbChains = thenResult.cbChains.concat(chains.slice(1))
            return nextTick(executeCbChains.bind(undefined, thenResult, isResolved, payload, cbChains))
        }

        return

    } else if (thenResult == null) {
        const instance = TKPromise.reject(new TypeError(`value '${thenResult}' is not thenable.`))
        instance.cbChains = target.cbChains.slice(1)
        instance.finally(target.cbFinally)
        return
    }

    nextTick(executeCbChains.bind(undefined, target, isResolved, thenResult, chains.slice(1)))
}

function handleResolve(result: any, context: TKPromise): void {
    if (context.state !== 'pending') return
    context.state = 'fulfilled'
    context.value = result
    nextTick(executeCbChains.bind(undefined, context, true, result, context.cbChains.slice()))
}

function handleReject(result: any, context: TKPromise): void {
    if (context.state !== 'pending') return
    context.state = 'rejected'
    context.value = result
    nextTick(executeCbChains.bind(undefined, context, false, result, context.cbChains.slice()))
}

function noramlizeThenHandler(handler: any) {
    if (typeof handler === 'function') return handler
    if (handler == null) return undefined
    return (v: any) => v
}

class TKPromise {
    state: States = 'pending'
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

        let isSettled = false

        executor((result) =>{
            if (isSettled) return
            isSettled = true
            handleResolve(result, this)
        }, (reason) => {
            if (isSettled) return
            isSettled = true
            handleReject(reason, this)
        })
    }

    /**
     * Promise.race() static method
     * @param promises promise instance list
     */
    static race(promises: TKPromise[]) {
        let done = false

        const instance = new TKPromise(noop)

        const _handlerResove = function (res: any) {
            if (done) return
            done = true
            promises.forEach(p => (p.state = 'fulfilled'))
            handleResolve(res, instance)
        }

        const _handleReject = function (res: any) {
            if (done) return
            done = true
            promises.forEach(p => (p.state = 'rejected'))
            handleReject(res, instance)
        }

        promises.forEach(p => p.then(_handlerResove, _handleReject))

        return instance
    }

    /**
     * Promise.all() static method
     * @param promises promise instance list
     */
    static all(promises: TKPromise[]) {
        const instance = new TKPromise(noop)
        const values: any[] = []

        const _handleResolve = function (idx: number, res: any) {
            values[idx] = res
            if (values.length === promises.length) {
                handleResolve(values, instance)
            }
        }

        const _handleReject = function (res: any) {
            handleReject(res, instance)
            promises.forEach(p => p.state = 'rejected')
        }

        promises.forEach((p, idx) =>
            p.then(_handleResolve.bind(undefined, idx), _handleReject),
        )

        return instance
    }

    /**
     * Promise.allSettled() static method
     * @param promises promise instance list
     */
    static allSettled(promises: TKPromise[]) {
        const values: any[] = []
        const instance = new TKPromise(noop)

        const handleResolveReject = function (idx: number, res: any) {
            values[idx] = res
            if (values.length === promises.length) {
                handleResolve(values, instance)
            }
        }

        promises.forEach((p, idx) =>
            p.then(
                handleResolveReject.bind(undefined, idx),
                handleResolveReject.bind(undefined, idx),
            )
        )

        return instance
    }

    /**
     * Promise.resolve() static method
     * @param value fulfilled value
     */
    static resolve(value?: any): TKPromise {
        return new TKPromise((resolve) => resolve(value))
    }

    /**
     * Promise.reject() static method
     * @param value rejected value
     */
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
