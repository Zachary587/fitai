export default async function handler(req, res) {
  // Only allow POST
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
    // Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
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

    let prediction = await createRes.json();

    if (prediction.error) {
      return res.status(500).json({ error: prediction.error });
    }

    // Poll until done (Vercel functions have a 60s timeout on hobby, 300s on pro)
    let polls = 0;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && polls < 55) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      prediction = await pollRes.json();
      polls++;
    }

    if (prediction.status === 'succeeded') {
      return res.status(200).json({ output: prediction.output });
    } else {
      return res.status(500).json({ error: prediction.error || 'Prediction timed out. Please try again.' });
    }

  } catch (err) {
    console.error('Tryon error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
