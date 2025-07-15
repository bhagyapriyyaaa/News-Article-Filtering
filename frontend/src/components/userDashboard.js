import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  User,
  MessageSquare,
  Mic,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import "./HomePage.css";

// Use environment variables or backend endpoints in production
const NEWSAPI_BASE_URL = "https://newsapi.org/v2/top-headlines";
const NEWSAPI_KEY = "2f6d531d56be49d98d31f71d9cece7c1";
const COHERE_API_URL = "https://api.cohere.ai/v1/chat"; // Free tier available
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

const UserDashboard = () => {
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your AI News Assistant. Ask me for the latest news or general knowledge questions.",
    },
  ]);
  const [userMessage, setUserMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigate = useNavigate();
  const recognition = useRef(null);
  const isSpeechSupported =
    "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

  // Initialize speech recognition
  useEffect(() => {
    if (isSpeechSupported) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = "en-US";

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        handleSearch(transcript);
      };

      recognition.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
    }
  }, [isSpeechSupported]);

  const toggleListening = () => {
    if (!isSpeechSupported) {
      alert("Voice search is not supported in your browser");
      return;
    }

    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
    } else {
      recognition.current.start();
      setIsListening(true);
    }
  };

  // Improved news fetching with better error handling
  const fetchNews = async (query = "", country = "us") => {
    setIsLoading(true);
    try {
      let url;
      if (query) {
        url = `${NEWSAPI_BASE_URL}?q=${encodeURIComponent(
          query
        )}&pageSize=10&country=${country}&apiKey=${NEWSAPI_KEY}`;
      } else {
        url = `${NEWSAPI_BASE_URL}?country=${country}&pageSize=12&apiKey=${NEWSAPI_KEY}`;
      }

      // In production, this should call your backend endpoint
      const response = await fetch(url);

      if (!response.ok) throw new Error(`News API error: ${response.status}`);

      const data = await response.json();
      return data.articles.map((article) => ({
        title: article.title,
        url: article.url,
        source: article.source?.name || "Unknown",
        urlToImage: article.urlToImage || "/default-news.jpg",
        description: article.description || "No description available",
      }));
    } catch (error) {
      console.error("Fetch news error:", error);
      setFetchError("Could not fetch news. Trying alternative sources...");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch videos - consider using a backend endpoint
  const fetchVideos = async (query = "latest news") => {
    try {
      // This should call your backend in production
      const response = await fetch(
        `${YOUTUBE_API_URL}?part=snippet&q=${encodeURIComponent(
          query
        )}&type=video&maxResults=6&key=${"AIzaSyCv92OIT1wAddIVVqfy4FW0Lmm92iKCGZs"}`
      );
      const data = await response.json();
      return data.items.map((video) => ({
        title: video.snippet.title,
        videoId: video.id.videoId,
        thumbnail: video.snippet.thumbnails.medium.url,
        channel: video.snippet.channelTitle,
      }));
    } catch (error) {
      console.error("Fetch videos error:", error);
      return [];
    }
  };

  // Improved AI response handler with fallbacks
  const fetchAIResponse = async (message) => {
    setIsLoading(true);
    try {
      // First check if it's a news query
      const newsKeywords = ["news", "headlines", "update", "report"];
      const isNewsQuery = newsKeywords.some((word) =>
        message.toLowerCase().includes(word)
      );

      if (isNewsQuery) {
        const news = await fetchNews(message);
        if (news.length > 0) {
          const newsList = news
            .slice(0, 3)
            .map(
              (item) =>
                `• <a href="${item.url}" target="_blank">${item.title}</a> (${item.source})`
            )
            .join("<br>");

          return {
            sender: "bot",
            text: `Here's the latest news about "${message}":<br><br>${newsList}`,
          };
        }
      }

      // Use Cohere API as a free alternative (register for API key)
      const cohereResponse = await fetch(COHERE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${"l8aobIe166OjzdWwuEp90CTdOCmXXsc4WeUft5tP"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          model: "command-light", // Free tier model
          preamble:
            "You are a helpful news assistant. Provide concise answers with facts.",
        }),
      });

      const data = await cohereResponse.json();
      return {
        sender: "bot",
        text: data.text || "I couldn't find an answer to that question.",
      };
    } catch (error) {
      console.error("AI response error:", error);
      return {
        sender: "bot",
        text: "I'm having trouble connecting to my knowledge sources. Please try again later.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    const newsResults = await fetchNews(query);
    setArticles(newsResults);
    const videoResults = await fetchVideos(query);
    setVideos(videoResults);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    const newUserMessage = { sender: "user", text: userMessage };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setUserMessage("");

    const aiResponse = await fetchAIResponse(userMessage);
    setChatMessages((prev) => [...prev, aiResponse]);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("guest");
    navigate("/", { state: { logoutSuccess: true }, replace: true });
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const news = await fetchNews();
      setArticles(news);
      const youtubeVideos = await fetchVideos();
      setVideos(youtubeVideos);
    };
    loadData();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="logout-confirm-modal">
          <div className="logout-confirm-content">
            <p>Are you sure you want to logout?</p>
            <div className="logout-confirm-buttons">
              <button onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button onClick={handleLogout}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {fetchError && <div className="error-banner">{fetchError}</div>}

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-title">YOUR NEWS</div>
          <div className="nav-buttons">
            <Search onClick={() => setShowSearch(!showSearch)} />
            {showSearch && (
              <div className="search-box-container">
                <input
                  type="text"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleSearch(searchQuery)
                  }
                />
                {isSpeechSupported && (
                  <Mic
                    className={isListening ? "active" : ""}
                    onClick={toggleListening}
                  />
                )}
              </div>
            )}
            <User onClick={() => navigate("/profile")} />
            <MessageSquare onClick={() => navigate("/feedback")} />
            <LogOut onClick={() => setShowLogoutConfirm(true)} />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <header>
        <h1>Stay Informed</h1>
        <p>Your trusted source for the latest news</p>
      </header>

      {/* News Articles Grid */}
      <main className="news-grid">
        {articles.length > 0 ? (
          articles.map((news, index) => (
            <div key={index} className="news-card">
              <img src={news.urlToImage} alt={news.title} />
              <div className="news-card-content">
                <span>{news.source}</span>
                <h2>{news.title}</h2>
                <p>{news.description}</p>
                <a href={news.url} target="_blank" rel="noopener noreferrer">
                  Read More →
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">No news articles found</div>
        )}
      </main>

      {/* Videos Section */}
      <section className="video-section">
        <h2>Latest News Videos</h2>
        <div className="news-grid">
          {videos.length > 0 ? (
            videos.map((video, index) => (
              <div key={index} className="video-card">
                <iframe
                  src={`https://www.youtube.com/embed/${video.videoId}`}
                  title={video.title}
                  allowFullScreen></iframe>
                <div className="news-card-content">
                  <h3>{video.title}</h3>
                  <p>{video.channel}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">No videos found</div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div>
          <Link to="/info#about">About</Link>
          <Link to="/info#contact">Contact</Link>
          <Link to="/info#privacy">Privacy Policy</Link>
        </div>
      </footer>

      {/* Chat Interface */}
      <div className="chat-icon" onClick={() => setShowChat(!showChat)}>
        <MessageCircle />
      </div>

      {showChat && (
        <div className="chatbox">
          <div className="chat-header">AI News Assistant</div>
          <div className="chat-body">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.sender}`}
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            ))}
            {isLoading && (
              <div className="chat-message bot">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          <form className="chat-footer" onSubmit={handleChatSubmit}>
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Ask about news or anything..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
