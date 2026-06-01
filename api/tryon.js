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

  const body = JSON.stringify({
    version: 'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
    input: {
      human_img: `data:image/jpeg;base64,${human_img}`,
      garm_img:  `data:image/jpeg;base64,${garm_img}`,
      garment_des: enrichedDesc,
      category: category || 'upper_body',
      crop: false,
      seed: 42,
      steps: 50
    }
  });

  // Retry up to 5 times on rate limit (429)
  let prediction, lastStatus;
  for (let attempt = 0; attempt < 5; attempt++) {
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body
    });

    lastStatus = createRes.status;

    if (createRes.status === 429) {
      // Rate limited — wait 4 seconds and retry
      await new Promise(r => setTimeout(r, 4000));
      continue;
    }

    const raw = await createRes.text();
    try { prediction = JSON.parse(raw); } catch(e) {
      return res.status(500).json({ error: 'Unexpected response: ' + raw.slice(0, 200) });
    }

    if (prediction.error) {
      return res.status(500).json({ error: 'Replicate error: ' + prediction.error });
    }

    if (!prediction.id) {
      return res.status(500).json({ error: 'No prediction ID. Status: ' + createRes.status });
    }

    return res.status(200).json({ id: prediction.id, status: prediction.status });
  }

  return res.status(429).json({ error: 'Rate limited by Replicate. Please try again in a few seconds.' });
}
