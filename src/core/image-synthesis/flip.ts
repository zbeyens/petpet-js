import {useGL} from "../utils/gl-utils"
// @ts-ignore
import shaderSource from './flip.glsl?raw'

export function flipImage(image: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')

    if (gl) return useGL(shaderSource, image, gl)

    const ctx = canvas.getContext('2d')

    canvas.width = image.width
    canvas.height = image.height

    ctx.translate(0, image.height)
    ctx.scale(1, -1)
    ctx.drawImage(image, 0, 0)

    return canvas
}
