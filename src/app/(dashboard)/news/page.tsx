import { getMarketNews } from '@/lib/api/finnhub';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { AISummary } from '@/components/ai/AISummary';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { formatDistanceToNow } from 'date-fns';

export default async function NewsPage() {
  const news = await getMarketNews().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market News</h1>
        <p className="text-zinc-400 text-sm mt-1">Latest financial news and insights</p>
      </div>

      <AISummary
        articles={news.slice(0, 5).map((a) => ({
          headline: a.headline,
          summary: a.summary,
          source: a.source,
        }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card className="hover:border-zinc-700 transition-colors h-full">
              <CardContent className="py-4">
                <div className="flex gap-4">
                  {article.image && (
                    <img
                      src={article.image}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
                      {article.headline}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{article.summary}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-zinc-500">{article.source}</span>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(article.datetime * 1000), { addSuffix: true })}
                      </span>
                      <Badge variant={article.sentiment}>{article.sentiment}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <AIChatWidget />
    </div>
  );
}
