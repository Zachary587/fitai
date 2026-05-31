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
    return res.status(500).json({ error: 'Server not configured — REPLICATE_API_KEY missing' });
  }

  try {
    // Just CREATE the prediction and return the ID immediately
    // The frontend will poll /api/poll?id=xxx for the result
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
        input: {
          human_img: `data:image/jpeg;base64,${human_img}`,
          garm_img:  `data:image/jpeg;base64,${garm_img}`,
          garment_des: garment_des || 'clothing item',
          category: category || 'upper_body',
          crop: false,
          seed: 42,
          steps: 30
        }
      })
    });

    const prediction = await createRes.json();

    if (prediction.error) {
      return res.status(500).json({ error: prediction.error });
    }

    // Return just the prediction ID — frontend polls from here
    return res.status(200).json({ id: prediction.id, status: prediction.status });

  } catch (err) {
    console.error('Tryon error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
