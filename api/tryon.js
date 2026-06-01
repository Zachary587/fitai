export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { human_img, garm_img, garment_des, category } = req.body;

  if (!human_img || !garm_img) {
    return res.status(400).json({ error: 'Missing required images' });
  }

  const token = process.env.REPLICATE_API_KEY;
  if (!token) {
    return res.status(500).json({ error: 'REPLICATE_API_KEY not set on server' });
  }

  const enrichedDesc = (garment_des || 'clothing item') +
    ', natural fabric drape, realistic wrinkles, soft folds, lifelike material texture, photorealistic fit';

  // Upload images to Replicate file storage first, then use URLs
  async function uploadImage(b64) {
    const buffer = Buffer.from(b64, 'base64');
    const uploadRes = await fetch('https://api.replicate.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/jpeg'
      },
      body: buffer
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.urls?.get) throw new Error('File upload failed: ' + JSON.stringify(uploadData));
    return uploadData.urls.get;
  }

  try {
    // Upload both images to Replicate and get URLs
    const [humanUrl, garmUrl] = await Promise.all([
      uploadImage(human_img),
      uploadImage(garm_img)
    ]);

    const body = JSON.stringify({
      version: 'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
      input: {
        human_img: humanUrl,
        garm_img: garmUrl,
        garment_des: enrichedDesc,
        category: category || 'upper_body',
        crop: false,
        seed: 42,
        steps: 50
      }
    });

    // Retry up to 5 times on rate limit
    for (let attempt = 0; attempt < 5; attempt++) {
      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body
      });

      if (createRes.status === 429) {
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }

      const raw = await createRes.text();
      let prediction;
      try { prediction = JSON.parse(raw); } catch(e) {
        return res.status(500).json({ error: 'Unexpected response: ' + raw.slice(0, 300) });
      }

      if (prediction.error) {
        return res.status(500).json({ error: 'Replicate error: ' + prediction.error });
      }

      if (!prediction.id) {
        return res.status(500).json({ error: 'No prediction ID. Status: ' + createRes.status + ' Body: ' + raw.slice(0, 300) });
      }

      return res.status(200).json({ id: prediction.id, status: prediction.status });
    }

    return res.status(429).json({ error: 'Rate limited. Please try again in a few seconds.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
