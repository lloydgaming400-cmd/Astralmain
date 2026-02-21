import { useLeaderboard } from "@/hooks/use-stats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { Loader2, Trophy, Users, Shield, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaderboardPage() {
  const { data, isLoading, error } = useLeaderboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-12">
        <h3 className="text-lg font-bold">Failed to load leaderboard</h3>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-4xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-secondary via-yellow-200 to-secondary gold-glow">
          Heavenly Rankings
        </h1>
        <p className="text-muted-foreground">
          The most powerful cultivators in the realm.
        </p>
      </div>

      <Tabs defaultValue="cultivators" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="bg-white/5 border border-white/10 p-1 h-auto rounded-full">
            <TabsTrigger 
              value="cultivators"
              className="px-6 py-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
            >
              <Users className="w-4 h-4 mr-2" />
              Cultivators
            </TabsTrigger>
            <TabsTrigger 
              value="sects"
              className="px-6 py-2 rounded-full data-[state=active]:bg-secondary data-[state=active]:text-black transition-all duration-300"
            >
              <Shield className="w-4 h-4 mr-2" />
              Sects
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cultivators">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden"
          >
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-[100px] text-center font-display text-white">Rank</TableHead>
                  <TableHead className="font-display text-white">Cultivator</TableHead>
                  <TableHead className="font-display text-white">Current Realm</TableHead>
                  <TableHead className="text-right font-display text-white">Spirit XP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((user, index) => (
                  <motion.tr 
                    key={user.id} 
                    variants={item}
                    className="border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <TableCell className="font-medium text-center">
                      {index < 3 ? (
                        <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-black shadow-lg ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-yellow-500/50' :
                          index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-500/50' :
                          'bg-gradient-to-br from-orange-300 to-orange-600 shadow-orange-500/50'
                        }`}>
                          {index + 1}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">#{index + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {user.name || user.phoneId}
                        </div>
                        {user.sectTag && (
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-muted-foreground border border-white/10">
                            [{user.sectTag}]
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RankBadge xp={user.xp} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary/80 group-hover:text-primary transition-colors">
                      {user.xp.toLocaleString()} XP
                    </TableCell>
                  </motion.tr>
                ))}
                {data?.users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No cultivators have entered the realm yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </motion.div>
        </TabsContent>

        <TabsContent value="sects">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {data?.sects.map((sect, index) => (
              <motion.div 
                key={sect.id}
                variants={item}
                className="group relative p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-secondary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-secondary/10"
              >
                <div className="absolute top-4 right-4 text-6xl font-display font-black text-white/5 select-none pointer-events-none group-hover:text-secondary/10 transition-colors">
                  #{index + 1}
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center border border-secondary/30 group-hover:scale-110 transition-transform duration-300">
                    <Crown className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-secondary transition-colors">
                      {sect.name}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground">
                      [{sect.tag}]
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-mono">{sect.membersCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Treasury</span>
                    <span className="font-mono text-secondary">{sect.treasuryXp.toLocaleString()} XP</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Active Sect
                  </div>
                </div>
              </motion.div>
            ))}
            {data?.sects.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground bg-white/5 rounded-2xl border border-white/10">
                No sects have been founded yet. Reach 10,000 XP to found one!
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
