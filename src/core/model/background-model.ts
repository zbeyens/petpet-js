import {Expression, Parser} from "expr-eval";
import {getColor, getImageFromBlob} from "../utils/utils";

export interface BackgroundTemplate {
    size: [(string | number), (string | number)]
    color?: string | number[]
}

export const MAX_CONCURRENT_REQUESTS = 6

export class BackgroundModel {
    private hasTemplate: boolean = false
    protected width: Expression | number
    protected height: Expression | number
    protected color: string
    protected frames: HTMLImageElement[] | HTMLCanvasElement[]
    private loadingPromise: Promise<unknown | void>

    constructor(template?: BackgroundTemplate) {
        if (!template) return
        [this.width, this.height] = template.size.map(e =>
            typeof e === 'number' ? e : Parser.parse(e as string)
        )
        this.color = getColor(this.color)
        this.hasTemplate = true
    }

    set url(url: string) {
        this.loadingPromise = BackgroundModel.fetchImages(url).then(imgs => this.frames = imgs)
    }

    set images(imgs) {
        this.frames = imgs
    }

    async generate(sizeMap: { [key: string]: number }): Promise<HTMLCanvasElement[] | HTMLImageElement[]> {
        await this.loadingPromise

        if (this.frames) {
            if (!this.hasTemplate) {
                return this.frames
            }

            return this.frames.map(bg => {
                const ctx = this.getCtx(sizeMap)
                ctx.drawImage(bg, 0, 0)
                return ctx.canvas
            })
        }

        if (this.hasTemplate) return [this.getCtx(sizeMap).canvas]

        throw new Error('can not load background')
    }

    private getCtx(sizeMap: { [key: string]: number }) {
        const canvas = document.createElement('canvas')
        const evalExpression = e => typeof e === 'number' ? e : (e as Expression).evaluate(sizeMap)
        canvas.width = evalExpression(this.width)
        canvas.height = evalExpression(this.height)

        const ctx = canvas.getContext('2d')

        ctx.fillStyle = this.color
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        return ctx
    }

    static async fetchImages(baseUrl): Promise<HTMLImageElement[]> {
        let i = 0
        let hasError = false

        const queue: Set<Promise<void>> = new Set()
        const result: HTMLImageElement[] = []

        while (!hasError) {
            if (queue.size >= MAX_CONCURRENT_REQUESTS) await Promise.race(queue)

            const request = fetch(`${baseUrl}${i++}.png`)
                .then(p => p.blob())
                .then(getImageFromBlob)
                .then(img => result.push(img))
                .catch(() => hasError = true)
            const completionPromise = request.then(() => queue.delete(completionPromise))

            queue.add(completionPromise)
        }

        return result
    }
}

