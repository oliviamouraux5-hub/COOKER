'use server'

import { getStore } from '@netlify/blobs'

export async function uploadRecipeImage(formData: FormData) {
  const file = formData.get('image') as File
  if (!file) return { error: 'No file provided' }

  try {
    const store = getStore('recipe-images')
    const buffer = await file.arrayBuffer()
    const fileName = `${Date.now()}-${file.name}`
    
    await store.set(fileName, buffer, {
      metadata: { contentType: file.type }
    })

    // Note: Netlify Blobs URLs depend on the environment. 
    // In a real app, you'd generate a signed URL or use a public path.
    // For now, we'll return the key as the URL placeholder.
    return { url: fileName }
  } catch (error) {
    console.error('Upload error:', error)
    return { error: 'Failed to upload image' }
  }
}
