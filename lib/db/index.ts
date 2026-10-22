import path from "path";
import fs from "fs";

interface TableStore {
  users: any[];
  documents: any[];
  document_chunks: any[];
  chat_sessions: any[];
  chat_messages: any[];
  summaries: any[];
  concepts: any[];
  quizzes: any[];
  flashcard_decks: any[];
}

const DATA_FILE = path.join(process.cwd(), "knowdex_store.json");

class PersistentDatabase {
  private data: TableStore = {
    users: [],
    documents: [],
    document_chunks: [],
    chat_sessions: [],
    chat_messages: [],
    summaries: [],
    concepts: [],
    quizzes: [],
    flashcard_decks: [],
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        this.data = { ...this.data, ...JSON.parse(raw) };
      } else {
        this.save();
      }
    } catch (e) {
      console.warn("Failed to load database from disk, initializing fresh store:", e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save database to disk:", e);
    }
  }

  public run(sql: string, params: any[] = []): void {
    const s = sql.trim();

    if (s.startsWith("CREATE TABLE")) {
      return;
    }

    // INSERT INTO users
    if (s.includes("INSERT") && s.includes("users")) {
      const [id, email, name, password_hash, created_at] = params;
      const existing = this.data.users.find((u) => u.id === id || u.email === email);
      if (!existing) {
        this.data.users.push({
          id,
          email,
          name,
          password_hash,
          created_at: created_at || new Date().toISOString(),
        });
        this.save();
      }
      return;
    }

    // INSERT INTO documents
    if (s.includes("INSERT") && s.includes("documents")) {
      const [id, user_id, name, mime_type, size, status, page_count, word_count, summary, created_at] = params;
      this.data.documents.unshift({
        id,
        user_id,
        name,
        mime_type,
        size,
        status: status || "ready",
        page_count: page_count || 1,
        word_count: word_count || 0,
        summary: summary || "",
        created_at: created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // INSERT INTO document_chunks
    if (s.includes("INSERT") && s.includes("document_chunks")) {
      const [id, document_id, chunk_index, content, page_number, token_count, embedding, keywords, created_at] = params;
      this.data.document_chunks.push({
        id,
        document_id,
        chunk_index,
        content,
        page_number: page_number || 1,
        token_count: token_count || 0,
        embedding: embedding || null,
        keywords: keywords || null,
        created_at: created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // INSERT INTO chat_sessions
    if (s.includes("INSERT") && s.includes("chat_sessions")) {
      const [id, user_id, document_id, title, created_at, updated_at] = params;
      this.data.chat_sessions.unshift({
        id,
        user_id,
        document_id,
        title,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // UPDATE chat_sessions
    if (s.includes("UPDATE chat_sessions SET updated_at = ? WHERE id = ?")) {
      const [updated_at, id] = params;
      const sess = this.data.chat_sessions.find((cs) => cs.id === id);
      if (sess) {
        sess.updated_at = updated_at;
        this.save();
      }
      return;
    }

    // INSERT INTO chat_messages
    if (s.includes("INSERT") && s.includes("chat_messages")) {
      const [id, session_id, role, content, sourcesOrCreated, maybeCreated] = params;
      const hasSources = maybeCreated !== undefined;
      const sources = hasSources ? sourcesOrCreated : null;
      const created_at = hasSources ? maybeCreated : sourcesOrCreated;

      this.data.chat_messages.push({
        id,
        session_id,
        role,
        content,
        sources: sources || null,
        created_at: created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // INSERT INTO summaries
    if (s.includes("INSERT") && s.includes("summaries")) {
      const [id, document_id, summary_type, content, created_at] = params;
      this.data.summaries.push({
        id,
        document_id,
        summary_type,
        content,
        created_at: created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // INSERT INTO concepts
    if (s.includes("INSERT") && s.includes("concepts")) {
      const [id, document_id, concept, definition, importance, created_at] = params;
      this.data.concepts.push({
        id,
        document_id,
        concept,
        definition,
        importance,
        created_at: created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // INSERT INTO quizzes
    if (s.includes("INSERT") && s.includes("quizzes")) {
      const [id, document_id, title, difficulty, questions, created_at] = params;
      this.data.quizzes.unshift({
        id,
        document_id,
        title,
        difficulty,
        questions,
        score: null,
        created_at: created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // UPDATE quizzes SET score = ? WHERE id = ?
    if (s.includes("UPDATE quizzes SET score = ? WHERE id = ?")) {
      const [score, id] = params;
      const q = this.data.quizzes.find((x) => x.id === id);
      if (q) {
        q.score = score;
        this.save();
      }
      return;
    }

    // INSERT INTO flashcard_decks
    if (s.includes("INSERT") && s.includes("flashcard_decks")) {
      const [id, document_id, topic, cards, created_at] = params;
      this.data.flashcard_decks.unshift({
        id,
        document_id,
        topic,
        cards,
        created_at: created_at || new Date().toISOString(),
      });
      this.save();
      return;
    }

    // DELETES
    if (s.startsWith("DELETE FROM")) {
      const id = params[0];
      if (s.includes("document_chunks")) {
        this.data.document_chunks = this.data.document_chunks.filter((c) => c.document_id !== id);
      } else if (s.includes("summaries")) {
        this.data.summaries = this.data.summaries.filter((x) => x.document_id !== id);
      } else if (s.includes("concepts")) {
        this.data.concepts = this.data.concepts.filter((x) => x.document_id !== id);
      } else if (s.includes("quizzes")) {
        this.data.quizzes = this.data.quizzes.filter((x) => x.document_id !== id);
      } else if (s.includes("flashcard_decks")) {
        this.data.flashcard_decks = this.data.flashcard_decks.filter((x) => x.document_id !== id);
      } else if (s.includes("chat_messages")) {
        this.data.chat_messages = this.data.chat_messages.filter((x) => x.session_id !== id);
      } else if (s.includes("chat_sessions")) {
        if (s.includes("document_id = ?")) {
          this.data.chat_sessions = this.data.chat_sessions.filter((x) => x.document_id !== id);
        } else {
          this.data.chat_sessions = this.data.chat_sessions.filter((x) => x.id !== id);
        }
      } else if (s.includes("documents")) {
        this.data.documents = this.data.documents.filter((x) => x.id !== id);
      }
      this.save();
      return;
    }
  }

  public prepare(sql: string) {
    return {
      run: (...params: any[]) => {
        // Flatten params if passed as array
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        this.run(sql, flatParams);
      },
    };
  }

  public query(sql: string) {
    return {
      all: (...params: any[]): any[] => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return this.executeSelectAll(sql, flatParams);
      },
      get: (...params: any[]): any => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = this.executeSelectAll(sql, flatParams);
        return res[0] || null;
      },
    };
  }

  private executeSelectAll(sql: string, params: any[]): any[] {
    const s = sql.trim();

    // COUNT queries
    if (s.includes("COUNT(*) as count")) {
      if (s.includes("documents")) return [{ count: this.data.documents.length }];
      if (s.includes("chat_sessions")) return [{ count: this.data.chat_sessions.length }];
      if (s.includes("quizzes")) return [{ count: this.data.quizzes.length }];
      if (s.includes("flashcard_decks")) return [{ count: this.data.flashcard_decks.length }];
      return [{ count: 0 }];
    }

    // USERS
    if (s.includes("FROM users")) {
      if (s.includes("WHERE email = ?")) {
        return this.data.users.filter((u) => u.email === params[0]);
      }
      if (s.includes("WHERE id = ?")) {
        return this.data.users.filter((u) => u.id === params[0]);
      }
      return [...this.data.users];
    }

    // DOCUMENTS
    if (s.includes("FROM documents")) {
      if (s.includes("WHERE id = ?")) {
        return this.data.documents.filter((d) => d.id === params[0]);
      }
      if (s.includes("WHERE user_id = ?")) {
        return this.data.documents.filter((d) => d.user_id === params[0]);
      }
      if (s.includes("LIMIT")) {
        const limit = parseInt(s.split("LIMIT")[1].trim()) || 5;
        return this.data.documents.slice(0, limit);
      }
      return [...this.data.documents];
    }

    // DOCUMENT_CHUNKS
    if (s.includes("FROM document_chunks")) {
      const docId = params[0];
      const chunks = this.data.document_chunks
        .filter((c) => c.document_id === docId)
        .sort((a, b) => a.chunk_index - b.chunk_index);

      if (s.includes("LIMIT")) {
        const limit = parseInt(s.split("LIMIT")[1].trim()) || 20;
        return chunks.slice(0, limit);
      }
      return chunks;
    }

    // CHAT_SESSIONS
    if (s.includes("FROM chat_sessions")) {
      const enrich = (csList: any[]) =>
        csList.map((cs) => {
          const doc = this.data.documents.find((d) => d.id === cs.document_id);
          return { ...cs, document_name: doc?.name || "" };
        });

      if (s.includes("WHERE cs.id = ?") || s.includes("WHERE id = ?")) {
        return enrich(this.data.chat_sessions.filter((cs) => cs.id === params[0]));
      }
      if (s.includes("WHERE cs.user_id = ?") || s.includes("WHERE user_id = ?")) {
        return enrich(this.data.chat_sessions.filter((cs) => cs.user_id === params[0]));
      }
      if (s.includes("LIMIT")) {
        const limit = parseInt(s.split("LIMIT")[1].trim()) || 5;
        return enrich(this.data.chat_sessions.slice(0, limit));
      }
      return enrich(this.data.chat_sessions);
    }

    // CHAT_MESSAGES
    if (s.includes("FROM chat_messages")) {
      const sessionId = params[0];
      const msgs = this.data.chat_messages
        .filter((m) => m.session_id === sessionId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (s.includes("LIMIT")) {
        const limit = parseInt(s.split("LIMIT")[1].trim()) || 10;
        return msgs.slice(-limit);
      }
      return msgs;
    }

    // SUMMARIES
    if (s.includes("FROM summaries")) {
      const docId = params[0];
      return this.data.summaries.filter((x) => x.document_id === docId);
    }

    // CONCEPTS
    if (s.includes("FROM concepts")) {
      const docId = params[0];
      return this.data.concepts.filter((x) => x.document_id === docId);
    }

    // QUIZZES
    if (s.includes("FROM quizzes")) {
      const enrich = (qList: any[]) =>
        qList.map((q) => {
          const doc = this.data.documents.find((d) => d.id === q.document_id);
          return { ...q, document_name: doc?.name || "" };
        });

      if (s.includes("WHERE q.id = ?") || s.includes("WHERE id = ?")) {
        return enrich(this.data.quizzes.filter((q) => q.id === params[0]));
      }
      return enrich(this.data.quizzes);
    }

    // FLASHCARD_DECKS
    if (s.includes("FROM flashcard_decks")) {
      const enrich = (fList: any[]) =>
        fList.map((f) => {
          const doc = this.data.documents.find((d) => d.id === f.document_id);
          return { ...f, document_name: doc?.name || "" };
        });

      if (s.includes("WHERE f.id = ?") || s.includes("WHERE id = ?")) {
        return enrich(this.data.flashcard_decks.filter((f) => f.id === params[0]));
      }
      return enrich(this.data.flashcard_decks);
    }

    return [];
  }
}

export const db = new PersistentDatabase();
