import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";


// ==========================================================
// FIREBASE
// ==========================================================

const firebaseConfig = {
    apiKey: "AIzaSyBkh_Rk5-YwJ8hd13rVhaQGjHTsQchJRhM",
    authDomain: "lunex-100db.firebaseapp.com",
    projectId: "lunex-100db",
    storageBucket: "lunex-100db.firebasestorage.app",
    messagingSenderId: "551588365950",
    appId: "1:551588365950:web:3002ed5c69ca7139d3ba2f",
    measurementId: "G-7Z7DY5P9FY"
};


let firebaseApp;
let firebaseAuth;
let db;

try {

    firebaseApp =
        initializeApp(firebaseConfig);

    firebaseAuth =
        getAuth(firebaseApp);

    db =
        getFirestore(firebaseApp);

    console.log(
        "LUNEX Firebase подключен"
    );

} catch (error) {

    console.error(
        "Ошибка Firebase:",
        error
    );
}


// ==========================================================
// ПЕРЕМЕННЫЕ
// ==========================================================

let activeUser = null;
let activeConversationId = null;
let activeOtherUser = null;

let unsubscribeMessages = null;
let unsubscribeChats = null;


// ==========================================================
// БЫСТРЫЙ ПОИСК
// ==========================================================

function $(id) {
    return document.getElementById(id);
}


// ==========================================================
// ЭКРАНЫ
// ==========================================================

const welcome = $("welcome");
const auth = $("auth");
const home = $("home");


// ==========================================================
// TOAST
// ==========================================================

function showToast(message) {

    const toast = $("homeToast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;

    toast.classList.remove("hidden");

    setTimeout(() => {

        toast.classList.add("hidden");

    }, 3000);
}


// ==========================================================
// ГЕНЕРАЦИЯ LUNEX ID
// ==========================================================

async function generateUniqueLunexId() {

    let id;
    let exists = true;

    while (exists) {

        id =
            Math.floor(
                10000000 +
                Math.random() * 90000000
            ).toString();

        const result =
            await getDocs(
                query(
                    collection(
                        db,
                        "users"
                    ),
                    where(
                        "lunexId",
                        "==",
                        id
                    ),
                    limit(1)
                )
            );

        exists =
            !result.empty;
    }

    return id;
}


// ==========================================================
// СОЗДАНИЕ / ПРОВЕРКА ПРОФИЛЯ
// ==========================================================

async function ensureLunexId(user) {

    const userRef =
        doc(
            db,
            "users",
            user.uid
        );

    const snap =
        await getDoc(userRef);

    if (
        snap.exists() &&
        snap.data().lunexId
    ) {

        return snap.data().lunexId;
    }

    const newId =
        await generateUniqueLunexId();

    await setDoc(
        userRef,
        {
            uid: user.uid,

            lunexId: newId,

            displayName:
                user.displayName ||
                user.email?.split("@")[0] ||
                "LUNEX",

            email:
                (
                    user.email ||
                    ""
                ).toLowerCase(),

            lastSeen:
                serverTimestamp()
        },
        {
            merge: true
        }
    );

    return newId;
}
// ==========================================================
// ЗАГРУЗКА ПРОФИЛЯ
// ==========================================================

async function loadProfile(user) {

    if (!user) {
        return;
    }

    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );

        const snap =
            await getDoc(userRef);

        let data = {};

        if (snap.exists()) {
            data = snap.data();
        }

        const name =
            data.displayName ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Пользователь LUNEX";

        const email =
            data.email ||
            user.email ||
            "";

        const lunexId =
            data.lunexId ||
            await ensureLunexId(user);


        const profileName =
            $("profileName");

        const profileEmail =
            $("profileEmail");

        const profileLunexId =
            $("profileLunexId");

        const profileAvatar =
            $("profileAvatar");


        if (profileName) {

            profileName.textContent =
                name;
        }


        if (profileEmail) {

            profileEmail.textContent =
                email;
        }


        if (profileLunexId) {

            profileLunexId.textContent =
                lunexId;
        }


        if (profileAvatar) {

            profileAvatar.textContent =
                name
                    .charAt(0)
                    .toUpperCase();
        }

    } catch (error) {

        console.error(
            "Ошибка загрузки профиля:",
            error
        );
    }
}


// ==========================================================
// ОТКРЫТЬ HOME
// ==========================================================

async function openHome(user) {

    if (welcome) {

        welcome.classList.add(
            "hidden"
        );
    }

    if (auth) {

        auth.classList.add(
            "hidden"
        );
    }

    if (home) {

        home.classList.remove(
            "hidden"
        );
    }

    await loadProfile(user);
}


// ==========================================================
// ОТКРЫТЬ AUTH
// ==========================================================

function openAuth() {

    if (welcome) {

        welcome.classList.add(
            "hidden"
        );
    }

    if (auth) {

        auth.classList.remove(
            "hidden"
        );
    }

    if (home) {

        home.classList.add(
            "hidden"
        );
    }
}


// ==========================================================
// ВЕРНУТЬСЯ НА WELCOME
// ==========================================================

function openWelcome() {

    if (welcome) {

        welcome.classList.remove(
            "hidden"
        );
    }

    if (auth) {

        auth.classList.add(
            "hidden"
        );
    }

    if (home) {

        home.classList.add(
            "hidden"
        );
    }
}


// ==========================================================
// РЕГИСТРАЦИЯ
// ==========================================================

async function registerUser() {

    const email =
        $("registerEmail")?.value
            .trim()
            .toLowerCase();

    const password =
        $("registerPassword")?.value;

    const name =
        $("registerName")?.value
            .trim() ||
        "Пользователь LUNEX";


    if (!email || !password) {

        alert(
            "Введите email и пароль."
        );

        return;
    }


    if (password.length < 6) {

        alert(
            "Пароль должен содержать минимум 6 символов."
        );

        return;
    }

  try {

        const result =
            await createUserWithEmailAndPassword(
                firebaseAuth,
                email,
                password
            );


        const user =
            result.user;


        await updateProfile(
            user,
            {
                displayName:
                    name
            }
        );


        const lunexId =
            await ensureLunexId(
                user
            );


        await sendEmailVerification(
            user
        );


        alert(
            "Аккаунт создан!\n\n" +
            "Твой LUNEX ID: " +
            lunexId +
            "\n\n" +
            "Мы отправили письмо для подтверждения email."
        );


    } catch (error) {

        console.error(
            "Ошибка регистрации:",
            error
        );

        alert(
            error.code +
            "\n" +
            error.message
        );
    }
}


// ==========================================================
// ВХОД
// ==========================================================

async function loginUser() {

    const email =
        $("loginEmail")?.value
            .trim()
            .toLowerCase();

    const password =
        $("loginPassword")?.value;


    if (!email || !password) {

        alert(
            "Введите email и пароль."
        );

        return;
    }


    try {

        const result =
            await signInWithEmailAndPassword(
                firebaseAuth,
                email,
                password
            );


        const user =
            result.user;


        if (!user.emailVerified) {

            alert(
                "Сначала подтвердите email."
            );

            return;
        }


        await ensureLunexId(
            user
        );


        await openHome(
            user
        );


    } catch (error) {

        console.error(
            "Ошибка входа:",
            error
        );

        alert(
            error.code +
            "\n" +
            error.message
        );
    }
}


// ==========================================================
// ВХОД
// ==========================================================

async function loginUser() {

    const email =
        $("loginEmail")?.value
            .trim()
            .toLowerCase();

    const password =
        $("loginPassword")?.value;


    if (!email || !password) {

        alert(
            "Введите email и пароль."
        );

        return;
    }


    try {

        const result =
            await signInWithEmailAndPassword(
                firebaseAuth,
                email,
                password
            );


        const user =
            result.user;


        if (!user.emailVerified) {

            alert(
                "Сначала подтвердите email."
            );

            return;
        }


        await ensureLunexId(
            user
        );


        await openHome(
            user
        );


    } catch (error) {

        console.error(
            "Ошибка входа:",
            error
        );

        alert(
            error.code +
            "\n" +
            error.message
        );
    }
}


// ==========================================================
// СБРОС ПАРОЛЯ
// ==========================================================

async function resetPassword() {

    const email =
        $("loginEmail")?.value
            .trim()
            .toLowerCase();


    if (!email) {

        alert(
            "Сначала введи email."
        );

        return;
    }


    try {

        await sendPasswordResetEmail(
            firebaseAuth,
            email
        );

        alert(
            "Письмо для сброса пароля отправлено."
        );

    } catch (error) {

        console.error(
            error
        );

        alert(
            error.code +
            "\n" +
            error.message
        );
    }
}
// ==========================================================
// ПОИСК ПОЛЬЗОВАТЕЛЯ ПО LUNEX ID
// ==========================================================

async function findUserAndStartChat() {

    const input =
        $("userSearch");

    const status =
        $("chatStatus");


    if (!input) {

        console.error(
            "Не найден элемент userSearch"
        );

        return;
    }


    if (!activeUser) {

        if (status) {

            status.textContent =
                "Сначала войдите в аккаунт.";
        }

        return;
    }


    const lunexId =
        input.value.trim();


    // ------------------------------------------------------
    // ПРОВЕРКА ID
    // ------------------------------------------------------

    if (!/^\d{8}$/.test(lunexId)) {

        if (status) {

            status.textContent =
                "LUNEX ID должен содержать 8 цифр.";
        }

        return;
    }


    try {

        if (status) {

            status.textContent =
                "Поиск пользователя…";
        }


        // --------------------------------------------------
        // ИЩЕМ ПОЛЬЗОВАТЕЛЯ
        // --------------------------------------------------

        const result =
            await getDocs(
                query(
                    collection(
                        db,
                        "users"
                    ),
                    where(
                        "lunexId",
                        "==",
                        lunexId
                    ),
                    limit(1)
                )
            );


        console.log(
            "Результат поиска users:",
            result.size
        );


        // --------------------------------------------------
        // НЕ НАШЛИ
        // --------------------------------------------------

        if (result.empty) {

            if (status) {

                status.textContent =
                    "Пользователь с таким LUNEX ID не найден.";
            }

            return;
        }


        // --------------------------------------------------
        // ПОЛЬЗОВАТЕЛЬ НАЙДЕН
        // --------------------------------------------------

        const userDoc =
            result.docs[0];


        const otherUid =
            userDoc.id;


        const otherUser =
            userDoc.data();


        console.log(
            "Пользователь найден:",
            otherUser
        );


        // --------------------------------------------------
        // ПРОВЕРКА НА СЕБЯ
        // --------------------------------------------------

        if (
            otherUid ===
            activeUser.uid
        ) {

            if (status) {

                status.textContent =
                    "Это твой собственный LUNEX ID.";
            }

            return;
        }


        // --------------------------------------------------
        // СОЗДАЁМ УНИКАЛЬНЫЙ ID ЧАТА
        // --------------------------------------------------

        const conversationId =
            [
                activeUser.uid,
                otherUid
            ]
                .sort()
                .join("_");


        const conversationRef =
            doc(
                db,
                "conversations",
                conversationId
            );


        // --------------------------------------------------
        // ПРОВЕРЯЕМ, СУЩЕСТВУЕТ ЛИ ЧАТ
        // --------------------------------------------------

        const conversationSnap =
            await getDoc(
                conversationRef
            );


        // --------------------------------------------------
        // ЕСЛИ НЕТ — СОЗДАЁМ
        // --------------------------------------------------

        if (
            !conversationSnap.exists()
        ) {

            await setDoc(
                conversationRef,
                {
                    participants: [
                        activeUser.uid,
                        otherUid
                    ],

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                    lastMessage:
                        ""
                }
            );
        }


        if (status) {

            status.textContent =
                "";
        }


        // --------------------------------------------------
        // ОТКРЫВАЕМ ЧАТ
        // --------------------------------------------------

        await openConversation(
            conversationId,
            otherUid,
            otherUser
        );


    } catch (error) {

        console.error(
            "FIREBASE ERROR:",
            error
        );


        alert(
            error.code +
            "\n" +
            error.message
        );


        if (status) {

            status.textContent =
                "Ошибка: " +
                error.code +
                " — " +
                error.message;
        }
    }
}


// ==========================================================
// ОТКРЫТЬ ЧАТ
// ==========================================================

async function openConversation(
    conversationId,
    otherUid,
    otherUser
) {

    activeConversationId =
        conversationId;

    activeOtherUser =
        otherUser;


    const conversationName =
        $("conversationName");

    const conversationEmail =
        $("conversationEmail");

    const conversationAvatar =
        $("conversationAvatar");


    const name =
        otherUser.displayName ||
        otherUser.email?.split("@")[0] ||
        "Пользователь LUNEX";


    if (conversationName) {

        conversationName.textContent =
            name;
    }


    if (conversationEmail) {

        conversationEmail.textContent =
            otherUser.email ||
            "";
    }


    if (conversationAvatar) {

        conversationAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();
    }


    const chatWorkspace =
        $("chatWorkspace");


    if (chatWorkspace) {

        chatWorkspace.classList.remove(
            "hidden"
        );
    }


    // Загружаем сообщения
    listenForMessages(
        conversationId
    );
}
// ==========================================================
// СЛУШАТЬ СООБЩЕНИЯ
// ==========================================================

function listenForMessages(
    conversationId
) {

    // Останавливаем предыдущий listener
    if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages =
            null;
    }


    const messageList =
        $("messageList");


    if (!messageList) {

        console.error(
            "Не найден messageList"
        );

        return;
    }


    const messagesRef =
        collection(
            db,
            "conversations",
            conversationId,
            "messages"
        );


    const messagesQuery =
        query(
            messagesRef,
            orderBy(
                "createdAt",
                "asc"
            )
        );


    unsubscribeMessages =
        onSnapshot(
            messagesQuery,

            snapshot => {

                messageList.innerHTML =
                    "";


                snapshot.forEach(
                    messageDoc => {

                        const message =
                            messageDoc.data();


                        const messageElement =
                            document.createElement(
                                "div"
                            );


                        messageElement.className =
                            "message";


                        if (
                            message.senderId ===
                            activeUser.uid
                        ) {

                            messageElement.classList.add(
                                "own"
                            );
                        }


                        messageElement.textContent =
                            message.text ||
                            "";


                        messageList.appendChild(
                            messageElement
                        );
                    }
                );


                // Прокручиваем вниз
                messageList.scrollTop =
                    messageList.scrollHeight;
            },

            error => {

                console.error(
                    "Ошибка сообщений:",
                    error
                );

                alert(
                    "Ошибка сообщений:\n" +
                    error.code +
                    "\n" +
                    error.message
                );
            }
        );
}


// ==========================================================
// ОТПРАВИТЬ СООБЩЕНИЕ
// ==========================================================

async function sendMessage() {

    if (
        !activeUser ||
        !activeConversationId
    ) {

        return;
    }


    const input =
        $("messageInput");


    if (!input) {

        console.error(
            "Не найден messageInput"
        );

        return;
    }


    const text =
        input.value.trim();


    if (!text) {

        return;
    }


    try {

        // --------------------------------------------------
        // ДОБАВЛЯЕМ СООБЩЕНИЕ
        // --------------------------------------------------

        const messagesRef =
            collection(
                db,
                "conversations",
                activeConversationId,
                "messages"
            );


        await addDoc(
            messagesRef,
            {
                text:
                    text,

                senderId:
                    activeUser.uid,

                createdAt:
                    serverTimestamp()
            }
        );


        // --------------------------------------------------
        // ОБНОВЛЯЕМ ПОСЛЕДНЕЕ СООБЩЕНИЕ
        // --------------------------------------------------

        await setDoc(
            doc(
                db,
                "conversations",
                activeConversationId
            ),
            {
                lastMessage:
                    text,

                updatedAt:
                    serverTimestamp()
            },
            {
                merge: true
            }
        );


        // Очищаем поле
        input.value =
            "";


    } catch (error) {

        console.error(
            "Ошибка отправки сообщения:",
            error
        );


        alert(
            error.code +
            "\n" +
            error.message
        );
    }
}


// ==========================================================
// ОСТАНОВИТЬ СООБЩЕНИЯ
// ==========================================================

function stopMessagesListener() {

    if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages =
            null;
    }
}
// ==========================================================
// СПИСОК ЧАТОВ
// ==========================================================

function listenForChats(user) {

    // Останавливаем старый listener
    if (unsubscribeChats) {

        unsubscribeChats();

        unsubscribeChats =
            null;
    }


    const chatList =
        $("chatList");


    if (!chatList) {

        console.error(
            "Не найден chatList"
        );

        return;
    }


    const chatsQuery =
        query(
            collection(
                db,
                "conversations"
            ),
            where(
                "participants",
                "array-contains",
                user.uid
            ),
            orderBy(
                "updatedAt",
                "desc"
            )
        );


    unsubscribeChats =
        onSnapshot(
            chatsQuery,

            async snapshot => {

                chatList.innerHTML =
                    "";


                for (
                    const chatDoc
                    of snapshot.docs
                ) {

                    const data =
                        chatDoc.data();


                    const participants =
                        data.participants ||
                        [];


                    const otherUid =
                        participants.find(
                            uid =>
                                uid !==
                                user.uid
                        );


                    if (!otherUid) {

                        continue;
                    }


                    try {

                        const userSnap =
                            await getDoc(
                                doc(
                                    db,
                                    "users",
                                    otherUid
                                )
                            );


                        if (
                            !userSnap.exists()
                        ) {

                            continue;
                        }


                        const otherUser =
                            userSnap.data();


                        const name =
                            otherUser.displayName ||
                            otherUser.email ||
                            "Пользователь LUNEX";


                        const item =
                            document.createElement(
                                "button"
                            );


                        item.type =
                            "button";


                        item.className =
                            "chat-item";


                        item.innerHTML =
                            `
                            <span class="avatar">
                                ${name
                                    .charAt(0)
                                    .toUpperCase()}
                            </span>

                            <span>
                                ${name}
                            </span>
                            `;


                        item.addEventListener(
                            "click",
                            () => {

                                openConversation(
                                    chatDoc.id,
                                    otherUid,
                                    otherUser
                                );
                            }
                        );


                        chatList.appendChild(
                            item
                        );


                    } catch (error) {

                        console.error(
                            "Ошибка загрузки пользователя чата:",
                            error
                        );
                    }
                }
            },

            error => {

                console.error(
                    "Ошибка списка чатов:",
                    error
                );

                alert(
                    "Ошибка списка чатов:\n" +
                    error.code +
                    "\n" +
                    error.message
                );
            }
        );
}


// ==========================================================
// ОСТАНОВИТЬ ВСЕ LISTENERS
// ==========================================================

function stopListeners() {

    if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages =
            null;
    }


    if (unsubscribeChats) {

        unsubscribeChats();

        unsubscribeChats =
            null;
    }
}


// ==========================================================
// ВЫХОД ИЗ АККАУНТА
// ==========================================================

async function logoutUser() {

    try {

        stopListeners();


        await signOut(
            firebaseAuth
        );


        activeUser =
            null;


        activeConversationId =
            null;


        activeOtherUser =
            null;


        openWelcome();


    } catch (error) {

        console.error(
            "Ошибка выхода:",
            error
        );


        alert(
            error.code +
            "\n" +
            error.message
        );
    }
}


// ==========================================================
// КОПИРОВАНИЕ LUNEX ID
// ==========================================================

$("copyLunexId")
    ?.addEventListener(
        "click",
        async () => {

            const element =
                $("profileLunexId");


            if (!element) {

                return;
            }


            const id =
                element.textContent.trim();


            if (!id) {

                return;
            }


            try {

                await navigator.clipboard.writeText(
                    id
                );


                showToast(
                    "LUNEX ID скопирован"
                );


            } catch (error) {

                console.error(
                    "Ошибка копирования:",
                    error
                );
            }
        }
    );
// ==========================================================
// КНОПКА ПОИСКА
// ==========================================================

$("searchUserButton")
    ?.addEventListener(
        "click",
        findUserAndStartChat
    );


// ==========================================================
// ENTER В ПОИСКЕ
// ==========================================================

$("userSearch")
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                findUserAndStartChat();
            }
        }
    );


// ==========================================================
// ОТПРАВКА СООБЩЕНИЯ
// ==========================================================

$("sendMessageButton")
    ?.addEventListener(
        "click",
        sendMessage
    );


$("messageForm")
    ?.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            sendMessage();
        }
    );


// ==========================================================
// РЕГИСТРАЦИЯ
// ==========================================================

$("registerButton")
    ?.addEventListener(
        "click",
        registerUser
    );


// ==========================================================
// ВХОД
// ==========================================================

$("loginButton")
    ?.addEventListener(
        "click",
        loginUser
    );


// ==========================================================
// СБРОС ПАРОЛЯ
// ==========================================================

$("forgotPassword")
    ?.addEventListener(
        "click",
        resetPassword
    );


// ==========================================================
// ВЫХОД — ОТКРЫТЬ МОДАЛЬНОЕ ОКНО
// ==========================================================

$("logoutButton")
    ?.addEventListener(
        "click",
        () => {

            const modal =
                $("logoutModal");


            if (modal) {

                modal.classList.remove(
                    "hidden"
                );
            }
        }
    );


// ==========================================================
// ОТМЕНА ВЫХОДА
// ==========================================================

$("cancelLogout")
    ?.addEventListener(
        "click",
        () => {

            const modal =
                $("logoutModal");


            if (modal) {

                modal.classList.add(
                    "hidden"
                );
            }
        }
    );


// ==========================================================
// ПОДТВЕРДИТЬ ВЫХОД
// ==========================================================

$("confirmLogout")
    ?.addEventListener(
        "click",
        async () => {

            const modal =
                $("logoutModal");


            if (modal) {

                modal.classList.add(
                    "hidden"
                );
            }


            await logoutUser();
        }
    );


// ==========================================================
// ПЕРЕХОД НА AUTH
// ==========================================================

$("startButton")
    ?.addEventListener(
        "click",
        openAuth
    );


$("loginTab")
    ?.addEventListener(
        "click",
        openAuth
    );


$("registerTab")
    ?.addEventListener(
        "click",
        openAuth
    );


// ==========================================================
// НАВИГАЦИЯ
// ==========================================================

document
    .querySelectorAll(
        "[data-tab]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const tab =
                        button.dataset.tab;


                    document
                        .querySelectorAll(
                            "[data-tab]"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );
                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    document
                        .querySelectorAll(
                            ".tab-content"
                        )
                        .forEach(
                            content => {

                                content.classList.add(
                                    "hidden"
                                );
                            }
                        );


                    const target =
                        $(tab);


                    if (target) {

                        target.classList.remove(
                            "hidden"
                        );
                    }
                }
            );
        }
    );


// ==========================================================
// FIREBASE AUTH STATE
// ==========================================================

if (
    firebaseAuth &&
    db
) {

    onAuthStateChanged(
        firebaseAuth,

        async user => {

            if (
                user &&
                user.emailVerified
            ) {

                activeUser =
                    user;


                try {

                    // Получаем / создаём LUNEX ID
                    const lunexId =
                        await ensureLunexId(
                            user
                        );


                    console.log(
                        "LUNEX ID:",
                        lunexId
                    );


                    // Открываем главную
                    await openHome(
                        user
                    );


                    // Показываем ID в профиле
                    const idElement =
                        $("profileLunexId");


                    if (idElement) {

                        idElement.textContent =
                            lunexId;
                    }


                    // Загружаем список чатов
                    listenForChats(
                        user
                    );


                } catch (error) {

                    console.error(
                        "Ошибка загрузки пользователя:",
                        error
                    );


                    alert(
                        "Ошибка Firebase:\n" +
                        error.code +
                        "\n" +
                        error.message
                    );
                }


            } else {

                activeUser =
                    null;


                stopListeners();


                if (home) {

                    home.classList.add(
                        "hidden"
                    );
                }


                if (welcome) {

                    welcome.classList.remove(
                        "hidden"
                    );
                }
            }
        }
    );
}


// ==========================================================
// LUNEX ЗАПУЩЕН
// ==========================================================

console.log(
    "LUNEX script.js загружен"
);