function decodeSnowflake() {
    const input = document.getElementById('snowflakeInput').value.trim();
    const resultGrid = document.getElementById('resultGrid');
    const emptyState = document.getElementById('emptyState');
    const toast = document.getElementById('toast');

    if (!input) {
        showToast('Please enter a Snowflake ID.');
        return;
    }

    try {
        const snowflake = BigInt(input);
        
        // Discord Epoch: 1420070400000 (Jan 1, 2015)
        const DISCORD_EPOCH = 1420070400000n;
        
        // Decoding logic
        // timestamp = (snowflake >> 22) + DISCORD_EPOCH
        // workerID = (snowflake & 0x3E0000n) >> 17n
        // processID = (snowflake & 0x1F000n) >> 12n
        // increment = snowflake & 0xFFFn

        const timestamp = (snowflake >> 22n) + DISCORD_EPOCH;
        const workerID = (snowflake & 0x3E0000n) >> 17n;
        const processID = (snowflake & 0x1F000n) >> 12n;
        const increment = snowflake & 0xFFFn;

        const date = new Date(Number(timestamp));

        // Display results
        document.getElementById('resDate').textContent = date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
        document.getElementById('resTimestamp').textContent = timestamp.toString();
        document.getElementById('resWorker').textContent = workerID.toString();
        document.getElementById('resProcess').textContent = processID.toString();
        document.getElementById('resIncrement').textContent = increment.toString();

        // Show UI
        resultGrid.style.display = 'grid';
        emptyState.style.display = 'none';

    } catch (e) {
        showToast('Invalid Snowflake ID. Please check the format.');
        resultGrid.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Allow pressing Enter to decode
document.getElementById('snowflakeInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        decodeSnowflake();
    }
});
