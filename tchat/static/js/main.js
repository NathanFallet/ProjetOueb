var channel = undefined;
var messages = [];
var page = 1;
var emojisToggled = false;
var editingMessage = -1;

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function saveData(data) {
    // Save channel
    channel = data.channel;

    // Save last message id from messages
    let lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : -1;

    // Add messages that are not already saved
    for (let i = 0; i < data.messages.length; i++) {
        let found = false;
        for (let j = 0; j < messages.length; j++) {
            if (messages[j].id === data.messages[i].id) {
                found = true;
                break;
            }
        }
        if (!found) {
            messages.push(data.messages[i]);
        }
    }

    // Sort by date
    messages.sort((a, b) => {
        return new Date(a['published']) - new Date(b['published']);
    });

    // Update HTML (DOM)
    updateHTML();

    // Check if there is a newer message (to scroll)
    let newMessageId = messages.length > 0 ? messages[messages.length - 1].id : -1;
    if (lastMessageId !== newMessageId) {
        window.scrollTo(0, document.body.scrollHeight);
    }
}

function updateHTML() {
    var items = [];
    $.each(messages, (_, message) => {
        items.push("<div class='balon" + (message['user']['me'] ? '1' : '2') + " p-2 m-0 position-relative' data-is='"
            + message['user']['username'] + " - "
            + new Date(message['published']).toLocaleString() + "'><span class='float-" + (message['user']['me'] ? 'end' : 'start') + "'>"
            + message['content'] + "</span>"
            + (
                message['user']['me'] || channel['membership']['role'] == 'owner' || channel['membership']['role'] == 'admin' ?
                "<div class='btns'>"
                + "<button class='btn btn-danger btn-sm' onclick='deleteMessage(" + channel['id'] + ", " + message['id'] + ")'><i class='fa-solid fa-trash'></i></button>"
                + "<button class='btn btn-success btn-sm mx-1' onclick='preEditMessage(" + message['id'] + ")'><i class='fa-solid fa-pen'></i></button>"
                + "</div>" :
                ""
            )
            + "</div>"
        );
    });
    $("#channel-messages").html(items.join(""));
}

function loadNextPage(id) {
    // Get messages from JSON
    page++;
    $.ajax({
        url: "/channels/" + id + "/messages/" + page + "/",
        type: "GET",
        success: function (data) {
            if (data.messages.length == 0) {
                $("#tchat-more").remove();
            }
            saveData(data);
        }
    });
}

function loadConversation(id) {
    // Get messages from JSON
    $.ajax({
        url: "/channels/" + id + "/messages/",
        type: "GET",
        success: function (data) {
            saveData(data);
        }
    });

    setTimeout(function () {
        loadConversation(id);
    }, 1000);
}

function sendMessage(id) {
    // Get message, and clear text
    let text = $("#message-text").val();
    $("#message-text").val("");
    if (text === "") {
        return;
    }

    // Send it to server
    const csrftoken = getCookie('csrftoken');
    const message_id = editingMessage;
    $.ajax({
        url: "/channels/" + id + "/messages/",
        type: "POST",
        headers: {
            "X-CSRFToken": csrftoken
        },
        data: {
            "message_id": message_id,
            "content": text
        },
        success: function (data) {
            messages = messages.filter((message) => {
                return message.id !== message_id;
            });
            saveData(data);
        }
    });
    editingMessage = -1;
}

function addUserToChannel(id) {
    // Get user
    let text = $("#user-select").val();

    // Send it to server
    const csrftoken = getCookie('csrftoken');
    $.ajax({
        url: "/channels/" + id + "/users/",
        type: "POST",
        headers: {
            "X-CSRFToken": csrftoken
        },
        data: {
            "user": text
        },
        success: function (data) {
            location.reload();
        }
    });
}

function createChannel() {
    // Get channel name
    let name = $("#channel-name").val();

    // Send it to server
    const csrftoken = getCookie('csrftoken');
    $.ajax({
        url: "/channels/",
        type: "POST",
        headers: {
            "X-CSRFToken": csrftoken
        },
        data: {
            "name": name
        },
        success: function (data) {
            location.reload();
        }
    });
}

function showEmojis() {
    emojisToggled = !emojisToggled;
    $("#emoji-keyboard").css('display', emojisToggled ? 'block' : 'none');
}

function insertEmoji(emo) {
    let text = $("#message-text").val();
    $("#message-text").val(text + emo);
}

function editUserRole(channel, user, role) {
    // Send it to server
    const csrftoken = getCookie('csrftoken');
    $.ajax({
        url: "/channels/" + channel + "/users/" + user + "/",
        type: "POST",
        headers: {
            "X-CSRFToken": csrftoken
        },
        data: {
            "role": role
        },
        success: function (data) {
            location.reload();
        }
    });
}

function deleteUser(channel, user) {
    // Send it to server
    const csrftoken = getCookie('csrftoken');
    $.ajax({
        url: "/channels/" + channel + "/users/" + user + "/",
        type: "DELETE",
        headers: {
            "X-CSRFToken": csrftoken
        },
        success: function (data) {
            location.reload();
        }
    });
}

function deleteMessage(id, message_id) {
    const csrftoken = getCookie('csrftoken');
    $.ajax({
        url: "/channels/" + id + "/messages/" + message_id + "/",
        type: "DELETE",
        headers: {
            "X-CSRFToken": csrftoken
        },
        success: function (data) {
            messages = messages.filter((message) => {
                return message.id !== message_id;
            });
            updateHTML();
        }
    });
}

function preEditMessage(message_id) {
    editingMessage = message_id;
    let message = messages.find((message) => {
        return message['id'] == message_id;
    });
    $("#message-text").val(message.content);
}

function deleteChannel(channel_id) {
    const csrftoken = getCookie('csrftoken');
    $.ajax({
        url: "/channels/" + channel_id + "/",
        type: "DELETE",
        headers: {
            "X-CSRFToken": csrftoken
        },
        success: function (data) {
            window.location.href = "/";
        }
    });
}

function editChannel(channel_id) {
    let name = $("#channel-name").val();
    const csrftoken = getCookie('csrftoken');
    $.ajax({
        url: "/channels/" + channel_id + "/",
        type: "POST",
        headers: {
            "X-CSRFToken": csrftoken
        },
        data: {
            "name": name
        },
        success: function (data) {
            location.reload();
        }
    });
}
