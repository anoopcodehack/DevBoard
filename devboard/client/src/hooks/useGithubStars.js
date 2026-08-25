import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Fetches the GitHub star count for a given repo.
 *
 * @param {string} repo - "owner/repo" string (defaults to anoopcodehack/DevBoard)
 * @returns {{ stars: number|null, loading: boolean }}
 */
export const useGithubStars = (repo = "anoopcodehack/DevBoard") => {
  const [stars, setStars] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStars = async () => {
      try {
        const { data } = await axios.get(
          `https://api.github.com/repos/${repo}`
        );
        if (!cancelled) {
          setStars(data.stargazers_count);
        }
      } catch (err) {
        console.warn("useGithubStars: failed to fetch star count", err);
        // Leave stars as null — caller renders a safe fallback
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStars();

    return () => {
      cancelled = true;
    };
  }, [repo]);

  return { stars, loading };
};
