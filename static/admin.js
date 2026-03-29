// admin.js — handles login, dashboard, approve/reject, and JWT token management

// save JWT token in memory — never in localStorage for security
let token = null;
let currentFilter = 'all';

// ─── login ───────────────────────────────────────────

async function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    // hide previous error
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
        // send credentials to flask backend
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // save token in memory
            token = data.access_token;

            // show dashboard and hide login
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('dashboardPage').style.display = 'block';

            // update nav to show logout button
            document.getElementById('navRight').innerHTML = `
        <span class="nav-admin-badge">Admin Panel</span>
        <button class="logout-btn" onclick="doLogout()">Sign Out</button>
      `;

            // set today's date in header
            document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            // load requests from backend
            loadRequests();
        } else {
            // wrong credentials
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

// ─── logout ──────────────────────────────────────────

function doLogout() {
    // clear token from memory
    token = null;

    // go back to login page
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';

    // reset nav
    document.getElementById('navRight').innerHTML = `
    <span class="nav-admin-badge">Restricted Access</span>
  `;

    // clear inputs
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

// ─── load requests from backend ──────────────────────

async function loadRequests() {
    try {
        const response = await fetch('/api/requests', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.status === 401) {
            // token expired — send back to login
            doLogout();
            return;
        }

        const data = await response.json();
        renderDashboard(data.requests);
    } catch (err) {
        console.error('Failed to load requests:', err);
    }
}

// ─── render dashboard ────────────────────────────────

function renderDashboard(requests) {
    // filter by language pair if needed
    const filtered = currentFilter === 'all'
        ? requests
        : requests.filter(r => r.language_pair === currentFilter);

    // update stat cards
    document.getElementById('statTotal').textContent = filtered.length;
    document.getElementById('statPending').textContent = filtered.filter(r => r.status === 'pending').length;
    document.getElementById('statApproved').textContent = filtered.filter(r => r.status === 'approved').length;
    document.getElementById('statRejected').textContent = filtered.filter(r => r.status === 'rejected').length;

    // split into pending and resolved
    const pending = filtered.filter(r => r.status === 'pending');
    const resolved = filtered.filter(r => r.status !== 'pending');

    // render pending list
    const pendingList = document.getElementById('pendingList');
    pendingList.innerHTML = pending.length
        ? pending.map(r => renderPendingCard(r)).join('')
        : '<div class="empty-state">No pending requests</div>';

    // render resolved list
    const resolvedList = document.getElementById('resolvedList');
    resolvedList.innerHTML = resolved.length
        ? resolved.map(r => renderResolvedCard(r)).join('')
        : '<div class="empty-state">No resolved requests yet</div>';
}

// ─── card templates ───────────────────────────────────

function renderPendingCard(r) {
    return `
    <div class="request-card" id="card-${r.id}">
      <div class="req-top">
        <span class="req-pill">${r.language_pair}</span>
        <span class="req-project">${r.project_type}</span>
      </div>
      <div class="req-name">${r.name}</div>
      <div class="req-meta">${r.email} · ${r.phone}</div>
      <div class="req-message">"${r.message}"</div>
      <div class="req-actions">
        <input class="date-input" type="date" id="date-${r.id}"/>
        <button class="btn-approve" onclick="approveRequest(${r.id})">Approve & Send Email</button>
        <button class="btn-reject"  onclick="rejectRequest(${r.id})">Reject</button>
      </div>
    </div>`;
}

function renderResolvedCard(r) {
    const statusHtml = r.status === 'approved'
        ? `<span class="status-text status-approved">Approved</span>
       <span class="meeting-info">· Meeting: ${r.meeting_date}</span>`
        : `<span class="status-text status-rejected">Rejected</span>`;

    return `
    <div class="request-card">
      <div class="req-top">
        <span class="req-pill ${r.status}">${r.language_pair}</span>
        <span class="req-project">${r.project_type}</span>
      </div>
      <div class="req-name">${r.name}</div>
      <div class="req-meta">${r.email} · ${r.phone}</div>
      <div class="req-message">"${r.message}"</div>
      <div class="req-actions">${statusHtml}</div>
    </div>`;
}

// ─── approve request ──────────────────────────────────

async function approveRequest(id) {
    const meetingDate = document.getElementById('date-' + id).value;

    if (!meetingDate) {
        alert('Please select a meeting date before approving.');
        return;
    }

    try {
        const response = await fetch(`/api/requests/${id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ meeting_date: meetingDate })
        });

        if (response.ok) {
            // reload requests to reflect change
            loadRequests();
        } else {
            alert('Failed to approve request. Please try again.');
        }
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── reject request ───────────────────────────────────

async function rejectRequest(id) {
    if (!confirm('Are you sure you want to reject this request?')) return;

    try {
        const response = await fetch(`/api/requests/${id}/reject`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.ok) {
            // reload requests to reflect change
            loadRequests();
        } else {
            alert('Failed to reject request. Please try again.');
        }
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── filter tabs ──────────────────────────────────────

document.getElementById('tabs').addEventListener('click', function (e) {
    if (!e.target.classList.contains('tab')) return;

    // update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');

    // set filter and reload
    currentFilter = e.target.dataset.filter;
    loadRequests();
});

// ─── allow login on enter key ─────────────────────────

document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.getElementById('loginPage').style.display !== 'none') {
        doLogin();
    }
});