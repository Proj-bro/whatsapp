let contacts = [];
let sending = false;

// Event listener for file import
document.getElementById("importContacts").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const rows = reader.result.split(/\r?\n/).slice(1); // Handle different line breaks and skip header
            rows.forEach((row) => {
                const columns = row.split(",").map((col) => col.trim()); // Trim whitespace
                if (columns.length >= 3) { // Ensure required fields are present
                    const name = columns[0] || "";
                    const mobile = columns[1] || "";
                    const group = columns[2] || "";

                    contacts.push({
                        row: contacts.length + 1,
                        name,
                        mobile,
                        group,
                        status: "created",
                        createdAt: new Date().toLocaleString(),
                        updatedAt: "",
                        response: "" // Store full API response
                    });

                    console.log(`Added contact: ${name} (${mobile}), Group: ${group}`);
                }
            });
            updateTable(); // Refresh the table with updated contacts
        };
        reader.readAsText(file);
    }
});

// Function to manually add a record
function addManualRecord() {
    const name = document.getElementById("manualName").value;
    const mobile = document.getElementById("manualMobile").value;
    const group = document.getElementById("manualGroup").value;

    const text = document.getElementById("globalText").value; // Get global text
    const image = document.getElementById("globalImage").value; // Get global image URL

    if (!name || !mobile || !text) {
        alert("Name, Mobile Number, and Text are required fields.");
        return;
    }

    // Save the text and image for this mobile number in local storage
    localStorage.setItem(`${mobile}_text`, text);
    localStorage.setItem(`${mobile}_image`, image);

    contacts.push({
        row: contacts.length + 1,
        name,
        mobile,
        group,
        status: "created",
        createdAt: new Date().toLocaleString(),
        updatedAt: "",
        response: "" // Store full API response
    });

    console.log(`Manually added contact: ${name} (${mobile}), Group: ${group}`);
    updateTable();

    // Reset form fields
    document.getElementById("manualForm").reset();
}

// Update the table with the current contacts data (including API response display)
function updateTable() {
    console.log("Updating the contacts table...");
    const tableBody = document.getElementById("contactsTable").querySelector("tbody");
    tableBody.innerHTML = "";
    contacts.forEach((contact, index) => {
        const savedResponse = contact.response ? contact.response : "No response received";

        tableBody.innerHTML += `
        <tr>
            <td><input type="checkbox" data-index="${index}"></td>
            <td>${contact.row}</td>
            <td>${contact.name}</td>
            <td>${contact.mobile}</td>
            <td>${contact.status}</td>
            <td>${contact.createdAt}</td>
            <td>${contact.updatedAt}</td>
            <td class="response">${savedResponse}</td>
        </tr>
        `;
    });
    console.log("Table updated successfully.");
}

// Updated sendMessage function to save full API response
async function sendMessage(contact, index) {
    const text = localStorage.getItem(`${contact.mobile}_text`) || localStorage.getItem('global_text');
    const image = localStorage.getItem(`${contact.mobile}_image`) || localStorage.getItem('global_image');

    const formattedText = encodeURIComponent(text.replace(/\n/g, "\n"));
    const url = image ?
        `https://api.textmebot.com/send.php?recipient=${contact.mobile}&apikey=THtedubUj8zV&text=${formattedText}&file=${encodeURIComponent(image)}` :
        `https://api.textmebot.com/send.php?recipient=${contact.mobile}&apikey=THtedubUj8zV&text=${formattedText}`;

    contacts[index].status = "processing";
    console.log(`Sending message to: ${contact.name} (${contact.mobile})`);
    updateTable();

    try {
        const response = await fetch(url);
        const responseText = await response.text();

        // Save the full API response
        contacts[index].response = responseText;
        console.log(`Response for ${contact.name} (${contact.mobile}):`, responseText);

        const resultMatch = responseText.match(/Result:\s*<b>(.*?)<\/b>/);
        if (resultMatch) {
            const result = resultMatch[1].trim();
            contacts[index].status = result === "Success!" ? "completed" : "failed";
        } else {
            contacts[index].status = "failed";
        }
    } catch (error) {
        console.error("Error during API request:", error);
        contacts[index].response = `Error: ${error.message}`;
        contacts[index].status = "failed";
    } finally {
        contacts[index].updatedAt = new Date().toLocaleString();
        console.log(`Updated status for ${contact.name} (${contact.mobile}): ${contacts[index].status}`);
        updateTable();
    }
}

// Function to send messages to the selected contacts
function sendSelected() {
    const selectedIndexes = Array.from(document.querySelectorAll("input[type='checkbox']:checked"))
        .map((checkbox) => parseInt(checkbox.dataset.index));
    console.log("Selected contacts for sending:", selectedIndexes);
    sendMessages(selectedIndexes);
}

// Function to send messages to all contacts
async function sendAll() {
    console.log("Sending messages to all contacts...");
    await sendMessages(contacts.map((_, index) => index));
}

// Function to send messages to the specified contacts
async function sendMessages(indexes) {
    if (sending) return;
    sending = true;

    for (let index of indexes) {
        console.log(`Processing contact at index: ${index}`);
        await sendMessage(contacts[index], index); // Wait for each message to be sent
        // Optional: You can introduce a delay if needed to avoid overloading the API
        await new Promise(resolve => setTimeout(resolve, 10000)); // Uncomment for 5 seconds delay
    }

    sending = false; // Reset sending flag after all messages are sent
    console.log("All messages sent.");
}

// Function to download the report as a CSV file
function downloadReport() {
    console.log("Downloading the report...");
    const csvContent = [
        ["Row", "Name", "Mobile Number", "Status", "Created Timestamp", "Updated Timestamp", "Response"].join(","),
        ...contacts.map(contact => [contact.row, contact.name, contact.mobile, contact.status, contact.createdAt, contact.updatedAt, contact.response].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "report.csv";
    link.click();
    console.log("Report downloaded successfully.");
}
