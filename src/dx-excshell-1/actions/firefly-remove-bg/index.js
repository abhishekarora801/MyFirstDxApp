const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const filesLib = require('@adobe/aio-lib-files')
const { errorResponse, stringParameters } = require('../utils')

const PS_REMOVE_BG_URL = 'https://image.adobe.io/v2/remove-background'
const PS_STATUS_BASE = 'https://image.adobe.io/v2/status'

async function getAccessToken (imsTokenUrl, clientId, clientSecret, scopes) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes
  })
  const res = await fetch(imsTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IMS token request failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.access_token
}

// Poll the Photoshop job status until done or timeout
async function pollJob (statusUrl, accessToken, clientId, maxWaitMs = 50000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': clientId
      }
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Status poll failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    const status = data.status || data.jobStatus
    if (status === 'succeeded' || status === 'success') return data
    if (status === 'failed' || status === 'error') {
      throw new Error(`Remove background job failed: ${JSON.stringify(data)}`)
    }
  }
  throw new Error('Remove background job timed out after 50 seconds')
}

async function main (params) {
  const logger = Core.Logger('firefly-remove-bg', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling firefly-remove-bg action')
    logger.debug(stringParameters(params))

    const { imageBase64, mimeType } = params
    if (!imageBase64) return errorResponse(400, 'Missing required parameter: imageBase64', logger)

    const clientId = params.FIREFLY_CLIENT_ID
    const clientSecret = params.FIREFLY_CLIENT_SECRET
    const scopes = params.FIREFLY_SCOPES || 'openid,AdobeID,firefly_api,ff_apis,photoshop_api'
    const imsTokenUrl = params.IMS_TOKEN_URL || 'https://ims-na1-stg1.adobelogin.com/ims/token/v3'

    if (!clientId || !clientSecret) {
      return errorResponse(500, 'Missing Firefly credentials (FIREFLY_CLIENT_ID / FIREFLY_CLIENT_SECRET)', logger)
    }

    const accessToken = await getAccessToken(imsTokenUrl, clientId, clientSecret, scopes)
    const imageBuffer = Buffer.from(imageBase64, 'base64')

    // Upload input image to AIO Files public storage to get a URL
    const files = await filesLib.init()
    const jobKey = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const inputPath = `public/rb-in-${jobKey}.jpg`
    const outputPath = `public/rb-out-${jobKey}.png`

    logger.info('Uploading input image to AIO Files storage')
    await files.write(inputPath, imageBuffer)
    const inputProps = await files.getProperties(inputPath)
    const inputUrl = inputProps.url

    // Create writable presigned URL for output
    await files.write(outputPath, Buffer.alloc(0))
    const outputPresignUrl = await files.generatePresignURL(outputPath, {
      permissions: 'rwd',
      expiryInSeconds: 600
    })

    logger.info('Calling Photoshop remove-background API')
    const psBody = {
      image: {
        source: { href: inputUrl, storage: 'external' }
      },
      output: {
        href: outputPresignUrl,
        storage: 'azure',
        mediaType: 'image/png',
        overwrite: true
      },
      mode: 'cutout'
    }

    const psRes = await fetch(PS_REMOVE_BG_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': clientId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(psBody)
    })

    if (!psRes.ok) {
      const text = await psRes.text()
      throw new Error(`Photoshop remove-background API failed (${psRes.status}): ${text}`)
    }

    const psData = await psRes.json()
    const jobHref = psData._links?.self?.href
    if (!jobHref) throw new Error('No job status URL in Photoshop API response')

    logger.info(`Polling job status: ${jobHref}`)
    await pollJob(jobHref, accessToken, clientId)

    // Read the output image from AIO Files and return as base64
    logger.info('Reading output image from AIO Files')
    const outputBuffer = await files.read(outputPath)
    const outputBase64 = Buffer.from(outputBuffer).toString('base64')

    // Cleanup temp files
    await Promise.allSettled([files.delete(inputPath), files.delete(outputPath)])

    return {
      statusCode: 200,
      body: {
        imageBase64: outputBase64,
        mimeType: 'image/png'
      }
    }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, error.message, logger)
  }
}

exports.main = main
