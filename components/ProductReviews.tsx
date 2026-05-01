'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Send, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const StarRating = ({ rating, setRating, readOnly = false }: { rating: number, setRating?: (rating: number) => void, readOnly?: boolean }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-6 h-6 cursor-pointer transition-all ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          onClick={() => !readOnly && setRating && setRating(star)}
        />
      ))}
    </div>
  );
};

interface Review {
  _id: string;
  userId?: string;
  userName?: string;
  rating: number;
  comment: string;
  likes?: number;
  dislikes?: number;
  createdAt: string;
}

const ReviewItem = ({ review, isOwner, onDelete }: { review: Review; isOwner: boolean; onDelete?: (id: string) => void }) => (
  <div className="py-4 border-b border-gray-100">
    <div className="flex items-center mb-2">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm mr-3">
        {review.userName?.charAt(0) || 'U'}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-gray-800">{review.userName || 'Anonymous'}</p>
        <StarRating rating={review.rating} readOnly />
      </div>
      {isOwner && onDelete && (
        <button
          onClick={() => onDelete(review._id)}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Устгах"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
      <button className="flex items-center gap-1 hover:text-blue-500"><ThumbsUp size={14} /> ({review.likes || 0})</button>
      <button className="flex items-center gap-1 hover:text-red-500"><ThumbsDown size={14} /> ({review.dislikes || 0})</button>
      <span className="text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
    </div>
  </div>
);

export default function ProductReviews({ productId }: { productId: string }) {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setHasPurchased(data.hasPurchased || false);
      }
    } catch (error) {
      toast.error('Үнэлгээг татахад алдаа гарлаа.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Үнэлгээ бичихийн тулд нэвтэрнэ үү.');
      return;
    }
    if (!hasPurchased) {
      toast.error('Зөвхөн худалдан авсан хэрэглэгчид үнэлгээ бичих боломжтой.');
      return;
    }
    if (rating === 0) {
      toast.error('Одтой үнэлгээг сонгоно уу.');
      return;
    }
    if (!comment.trim()) {
      toast.error('Сэтгэгдлээ бичнэ үү.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, comment, userName: user?.name }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Алдаа гарлаа');
      }

      await fetchReviews(); // Refetch reviews
      setRating(0);
      setComment('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    // Optimistic removal
    const prev = reviews;
    setReviews(reviews.filter(r => r._id !== reviewId));

    try {
      const res = await fetch(`/api/reviews?id=${reviewId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Алдаа гарлаа');
      }
      toast.success('Үнэлгээ устгагдлаа');
    } catch (error: any) {
      // Rollback
      setReviews(prev);
      toast.error(error.message || 'Үнэлгээ устгахад алдаа гарлаа');
    }
  };

  return (
    <div className="space-y-6">
      {isAuthenticated ? (
        hasPurchased ? (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">Үнэлгээ өгөх</h3>
            <div className="mb-3">
              <StarRating rating={rating} setRating={setRating} />
            </div>
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 pr-12 border border-gray-200 rounded-md focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all text-sm"
                rows={3}
                placeholder="Сэтгэгдлээ энд бичнэ үү..."
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:bg-gray-300 transition-colors flex items-center justify-center w-9 h-9"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 font-medium leading-relaxed">
              Зөвхөн энэхүү барааг худалдаж авсан хэрэглэгчид үнэлгээ болон сэтгэгдэл үлдээх боломжтой.
            </p>
          </div>
        )
      ) : (
        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-center">
          <p className="text-sm text-gray-500 font-medium">
            Үнэлгээ үлдээхийн тулд <a href="/sign-in" className="text-orange-500 font-bold hover:underline">Нэвтрэх</a> шаардлагатай.
          </p>
        </div>
      )}

      <div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">Хэрэглэгчийн үнэлгээ ({reviews.length})</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : reviews.length > 0 ? (
          reviews.map(review => (
            <ReviewItem
              key={review._id}
              review={review}
              isOwner={review.userId === user?.id || user?.role === 'admin'}
              onDelete={handleDeleteReview}
            />
          ))
        ) : (
          <p className="text-gray-500 text-sm py-4">Одоогоор үнэлгээ байхгүй байна.</p>
        )}
      </div>
    </div>
  );
}
