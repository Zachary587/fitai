export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing prediction id' });
  }

  const token = process.env.REPLICATE_API_KEY;
  if (!token) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const prediction = await pollRes.json();
    return res.status(200).json({
      status: prediction.status,
      output: prediction.output || null,
      error: prediction.error || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
