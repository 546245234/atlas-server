import { Coord } from './types'
import { loadImage } from 'canvas'
import path from 'path'

const renderAvatar = async (args: {
    ctx: CanvasRenderingContext2D
    path: string
    img_nw: Coord
    img_se: Coord
    nw: Coord
    se: Coord
    center: Coord
    width: number
    height: number
    size: number
    padding: number
    offset: number
    pan: Coord
}) => {
    const { ctx, path, img_nw, img_se, nw, se, width, height, center, size, pan, padding, offset } = args
    if (
        (img_nw.x > se.x || img_nw.x < nw.x || img_nw.y > nw.y || img_nw.y < se.y) &&
        (img_se.x > se.x || img_se.x < nw.x || img_se.y > nw.y || img_se.y < se.y)
    ) {
        return
    }

    const halfWidth = width / 2
    const halfHeight = height / 2
    const halfSize = size / 2

    const nw_offsetX = (center.x - img_nw.x) * size + (pan ? pan.x : 0)
    const nw_offsetY = (img_nw.y - center.y) * size + (pan ? pan.y : 0)
    const se_offsetX = (center.x - img_se.x) * size + (pan ? pan.x : 0)
    const se_offsetY = (img_se.y - center.y) * size + (pan ? pan.y : 0)

    const nw_x = halfWidth - nw_offsetX - halfSize + padding
    const nw_y = halfHeight - nw_offsetY - halfSize + padding

    const se_x = halfWidth - se_offsetX + halfSize
    const se_y = halfHeight - se_offsetY + halfSize
    const area_wth = Math.abs(nw_x - se_x)
    const area_het = Math.abs(nw_y - se_y)

    const imgData = await loadImage(path)
    // console.log(nw_x, nw_y, area_wth, area_het)
    // ctx.fillStyle = '#ffffff'
    // ctx.fillRect(nw_x, nw_y, area_wth, area_het)
    ctx.drawImage(imgData as any, nw_x, nw_y, area_wth, area_het)
}

export const renderAvatars = (args: {
    ctx: CanvasRenderingContext2D
    nw: Coord
    se: Coord
    center: Coord
    width: number
    height: number
    size: number
    pan: Coord
}) => {
    const { ctx, nw, se, center, width, height, size, pan } = args
    const padding = size < 7 ? 0.5 : size < 12 ? 1 : size < 18 ? 1.5 : 2
    const offset = 1

    imgs.forEach(img => {
        renderAvatar({ ctx, ...img, nw, se, width, height, center, size, pan, padding, offset })
    })
}

const imgs = [
    {
        path: path.resolve(__dirname, '../../public/logo192.png'),
        img_nw: {
            x: -9,
            y: 9
        },
        img_se: {
            x: 10,
            y: -9
        }
    }
]