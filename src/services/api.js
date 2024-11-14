export const sendMessage = async (message, hospitalId) => {
    const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: message,
            hospital_id: hospitalId
        })
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    return await response.json();
};