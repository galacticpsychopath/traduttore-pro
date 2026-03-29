// homepage.js — handles the customer request form submission

document.getElementById('requestForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    // grab all form values
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const project_type = document.getElementById('project_type').value;
    const language_pair = document.getElementById('language_pair').value;
    const message = document.getElementById('message').value.trim();

    // hide previous messages
    document.getElementById('formSuccess').style.display = 'none';
    document.getElementById('formError').style.display = 'none';

    // disable button while sending
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        // send the request to the flask backend
        const response = await fetch('/api/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, email, project_type, language_pair, message })
        });

        const data = await response.json();

        if (response.ok) {
            // show success message and reset form
            document.getElementById('formSuccess').style.display = 'block';
            document.getElementById('requestForm').reset();
        } else {
            // show error returned from backend
            document.getElementById('formError').style.display = 'block';
        }
    } catch (err) {
        // network or server error
        document.getElementById('formError').style.display = 'block';
    } finally {
        // re-enable button
        btn.disabled = false;
        btn.textContent = 'Submit Request';
    }
});